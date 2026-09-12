#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');

const corpus = __dirname;
const harness = path.resolve(corpus, '..');
const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const tasks = read(path.join(corpus, 'index.json')).tasks.map(task => {
  const directory = path.join(corpus, 'tasks', task.id);
  const yaml = YAML.parse(fs.readFileSync(path.join(directory, 'cases', `${task.id}.yaml`), 'utf8'));
  const metadata = fs.existsSync(path.join(directory, 'metadata.json')) ? read(path.join(directory, 'metadata.json')) : null;
  const manualReview = metadata ? { required: metadata.manual_review, status: 'pending', artifact: metadata.artifact, criteria: metadata.criteria } : null;
  return { ...task, directory, yaml, manualReview, prompts: (yaml.turns || [yaml.prompt]).map(prompt => prompt.replace(/\n+$/, '')) };
});

function snapshot(directory) {
  const entries = {};
  function visit(relative) {
    for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
      const key = path.join(relative, name);
      const target = path.join(directory, key);
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) entries[key] = { link: fs.readlinkSync(target) };
      else if (stat.isDirectory()) { entries[key] = 'directory'; visit(key); }
      else entries[key] = { mode: stat.mode & 0o777, sha: createHash('sha256').update(fs.readFileSync(target)).digest('hex') };
    }
  }
  visit('');
  return entries;
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024, ...options });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${command}: ${result.stderr}`);
  return result;
}

function candidate() {
  const args = process.argv.slice(3);
  if (args[0] === '--version') { console.log('fake-corpus-candidate'); return; }
  assert.equal(args[0], 'run');
  assert.equal(args[args.indexOf('--model') + 1], 'fake/reference');
  assert.equal(args[args.indexOf('--format') + 1], 'json');
  assert.equal(args[args.indexOf('--dir') + 1], process.cwd());
  assert(process.cwd().startsWith(process.env.CORPUS_TEST_ROOT + path.sep), 'candidate outside temporary root');
  for (const key of ['EVAL_FIXTURE_DIR', 'EVAL_WORKFLOWS_ROOT', 'EVAL_EVALS_DIR', 'EVAL_WORKFLOW_METADATA']) {
    assert.equal(process.env[key], undefined, `${key} leaked to candidate`);
  }
  for (const name of ['references', 'check.cjs', 'check-lib.cjs', 'bad.json', 'metadata.json', 'provenance.md']) {
    assert.equal(fs.existsSync(name), false, `${name} copied into inputs`);
  }
  const sessionFile = path.join(process.env.HOME, 'corpus-test-session.json');
  const sessionIndex = args.indexOf('--session');
  const requested = sessionIndex < 0 ? null : args[sessionIndex + 1];
  const prompt = args.at(-1).replace(/\n+$/, '');
  let session;
  let initial;
  if (requested === null) {
    assert(!fs.existsSync(sessionFile), 'new attempt reused a session');
    const task = tasks.find(task => task.prompts[0] === prompt);
    assert(task, 'unexpected first prompt');
    for (const [destination, source] of Object.entries(task.yaml.setup.fixtures)) {
      const expected = task.id === 'guarded-install' && destination === 'notes.txt'
        ? 'working user note\n' : fs.readFileSync(path.join(task.directory, source), 'utf8');
      assert.equal(fs.readFileSync(destination, 'utf8'), expected, `${task.id}: input ${destination}`);
    }
    if (task.id === 'guarded-install') {
      assert.equal(execute('git', ['show', ':notes.txt']).stdout, 'staged user note\n');
      assert.equal(execute('git', ['show', 'HEAD:notes.txt']).stdout, 'committed note\n');
    }
    if (task.id === 'path-migration') assert.equal(fs.readlinkSync('home/tool'), '../old-setup/tool.txt');
    initial = snapshot(process.cwd());
    session = { id: task.id, sessionID: `ses_${randomUUID()}`, turn: 0, workdir: process.cwd() };
  } else {
    session = read(sessionFile);
    assert.equal(requested, session.sessionID);
    assert.equal(session.workdir, process.cwd());
    if (session.id === 'path-migration') {
      assert.equal(read('active.json').dotfiles, 'new-setup/repo');
      assert.deepEqual(read('startup.json'), { setupRoot: 'new-setup/repo', editor: 'fixture-editor' });
    }
  }
  const task = tasks.find(task => task.id === session.id);
  assert.equal(prompt, task.prompts[session.turn], 'turn was combined, repeated, or sent out of order');
  for (const skill of task.yaml.skills_loaded) {
    const loaded = path.join(process.env.OPENCODE_CONFIG_DIR, 'skills', skill);
    assert(fs.existsSync(path.join(loaded, 'SKILL.md')));
    assert(!fs.existsSync(path.join(loaded, 'evals')), 'skill evals leaked');
  }

  // This fake has deliberate test-only reference access, not normal candidate access.
  assert.equal(process.env.CORPUS_TEST_REFERENCES, path.join(corpus, 'references'));
  const reference = path.join(process.env.CORPUS_TEST_REFERENCES, task.id);
  for (const name of fs.readdirSync(reference)) {
    if (!['prepare.sh', 'bad.json'].includes(name)) fs.copyFileSync(path.join(reference, name), name);
  }
  if (task.id === 'path-migration') {
    const destination = session.turn === 0 ? 'new-setup/repo' : 'new-setup';
    const result = execute('node', ['migrate.cjs', destination]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(read('startup.json'), { setupRoot: destination, editor: 'fixture-editor' });
  } else if (session.turn === task.prompts.length - 1 && fs.existsSync(path.join(reference, 'prepare.sh'))) {
    const result = execute('bash', [path.join(reference, 'prepare.sh')]);
    assert.equal(result.status, 0, result.stderr);
  }
  if (process.env.CORPUS_TEST_VARIANT === 'bad' && session.turn === task.prompts.length - 1) {
    const mutation = read(path.join(reference, 'bad.json'))[0];
    for (const name of mutation.restore || []) fs.copyFileSync(path.join(task.directory, task.yaml.setup.fixtures[name]), name);
    for (const [name, content] of Object.entries(mutation.write || {})) fs.writeFileSync(name, content);
    for (const [name, [before, after]] of Object.entries(mutation.replace || {})) {
      const content = fs.readFileSync(name, 'utf8');
      assert(content.includes(before), `stale mutation: ${mutation.name}`);
      fs.writeFileSync(name, content.replace(before, after));
    }
    for (const name of mutation.remove || []) fs.unlinkSync(name);
  }
  session.turn++;
  fs.writeFileSync(sessionFile, JSON.stringify(session));
  fs.appendFileSync(process.env.CORPUS_TEST_CALLS, JSON.stringify({
    ...session, requested, prompt, home: process.env.HOME, initial,
  }) + '\n');
  console.log(JSON.stringify({ type: 'text', sessionID: session.sessionID,
    part: { text: `Test-only reference overlay: ${task.id}, turn ${session.turn}.` } }));
  console.log(JSON.stringify({ type: 'step_finish', sessionID: session.sessionID,
    part: { reason: 'stop', cost: 0, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } } } }));
}

function main() {
  const pkg = path.resolve(process.env.EVAL_TEST_PACKAGE || path.join(harness, 'node_modules/@nano-step/eval-harness'));
  assert(fs.existsSync(path.join(pkg, 'scripts/eval/workflow.sh')),
    `Workflow runner not installed at ${pkg}. Install the patches or set EVAL_TEST_PACKAGE to a patched scratch package.`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-runner-'));
  const env = {
    PATH: `${temp}/bin:${harness}/shims:${process.env.PATH}`,
    HOME: `${temp}/home`, TMPDIR: temp, LANG: 'C', LC_ALL: 'C',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    OPENCODE_SKILLS_ROOT: path.resolve(harness, '../../../agents/skills'), OPENCODE_SKILLS_EXTRA_ROOT: '',
    OPENCODE_AUTH_FILE: '', OPENCODE_REAL_BIN: `${temp}/bin/forbidden`,
    EVAL_STATE_DIR: `${temp}/state`, EVAL_WORKFLOWS_ROOT: corpus,
    EVAL_SKIP_AUTH_CHECK: '1', EVAL_LLM_JUDGE_LIVE: '0', EVAL_RUNNER: 'host', EVAL_AUTOFIX: '0',
    EVAL_REPETITIONS: '1', EVAL_STABILITY_SAMPLES: '1', EVAL_MODE: 'full', EVAL_MAX_SECONDS: '30',
    EVAL_BYPASS: '0', EVAL_WARN_ONLY: '0', EVAL_MODEL: 'fake/reference', EVAL_SUITE: 'regression',
    EVAL_EVALS_DIR: '', EVAL_CASE_MODEL: '', EVAL_CHECK_TIMEOUT_SECONDS: '20',
    CORPUS_TEST_ROOT: temp, CORPUS_TEST_REFERENCES: path.join(corpus, 'references'),
    CORPUS_TEST_CALLS: `${temp}/calls.jsonl`, CORPUS_TEST_FORBIDDEN: `${temp}/forbidden.log`,
  };
  const sourceBefore = snapshot(corpus);
  let success = false;
  let commands = 0;
  const readCalls = () => fs.existsSync(env.CORPUS_TEST_CALLS)
    ? fs.readFileSync(env.CORPUS_TEST_CALLS, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  function command(script, args, expected, extra = {}) {
    const result = execute('bash', [path.join(pkg, 'scripts/eval', script), ...args], { cwd: temp, env: { ...env, ...extra } });
    commands++;
    fs.writeFileSync(path.join(temp, `command-${commands}.log`), result.stdout + result.stderr);
    assert.equal(result.status, expected, `${script} ${args.join(' ')}: expected ${expected}, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    return result;
  }
  function checkResults(result, task, passed) {
    assert.equal(result.passed, passed);
    assert.equal(result.checks.length, task.yaml.checks.length);
    for (const [index, check] of result.checks.entries()) {
      const spec = task.yaml.checks[index];
      assert.equal(check.kind, spec.kind);
      assert.equal(check.failed_check_id, `shell:${spec.cmd}`);
      assert.equal(check.expected, spec.expect_exact);
      assert.notEqual(check.error, true, 'assertion failure became a harness error');
      assert.equal(check.passed, passed);
      if (passed) {
        assert.equal(check.exit_code, 0);
        assert.equal(check.actual.trim(), 'ok');
      } else assert.equal(check.exit_code, 1, 'real task checker did not reject the mutation');
    }
  }
  function selection(args, split, bad = false) {
    const selected = tasks.filter(task => task.split === split);
    const count = split === 'development' ? 6 : 2;
    assert.equal(selected.length, count);
    const firstCall = readCalls().length;
    const repetitions = bad ? 1 : 2;
    const result = command('workflow.sh', [...args, `--repetitions=${repetitions}`, '--debug'], bad ? 12 : 0,
      { CORPUS_TEST_VARIANT: bad ? 'bad' : 'good' });
    const runs = [...result.stdout.matchAll(/run_id=([^\s]+)/g)].map(match => path.join(env.EVAL_STATE_DIR, 'runs', match[1]));
    assert.equal(runs.length, count, 'wrong selection size');
    const pending = selected.filter(task => task.manualReview?.required).length;
    assert.match(result.stdout, new RegExp(`\\[workflow\\] ${bad ? 'FAIL' : 'PASS'} \\(${bad ? count : count - pending}\\):`));
    if (!bad && pending) assert.match(result.stdout, new RegExp(`PENDING MANUAL REVIEW \\(${pending}; automatic checks passed\\)`));
    const saved = new Map();
    for (const directory of runs) {
      const summary = read(path.join(directory, 'results.json'));
      const task = selected.find(task => task.id === summary.workflow.id);
      assert(task, 'unselected task ran');
      assert(!saved.has(task.id), 'duplicate task run');
      saved.set(task.id, directory);
      assert.equal(summary.suite, 'workflow');
      assert.equal(summary.workflow.split, split);
      assert.deepEqual(summary.manual_review, task.manualReview);
      if (task.manualReview) assert.match(fs.readFileSync(path.join(directory, 'diff.md'), 'utf8'), /PENDING MANUAL REVIEW/);
      assert.equal(summary.summary.total, 1);
      assert.equal(summary.cases.length, 1);
      assert.equal(summary.cases[0].case_id, task.id);
      assert.equal(fs.readFileSync(path.join(directory, '.finished'), 'utf8').trim(), bad ? '12' : '0');
      const caseDirectory = path.join(directory, task.id);
      assert.deepEqual(YAML.parse(fs.readFileSync(path.join(caseDirectory, 'case.yaml'), 'utf8')), task.yaml);
      assert.equal(summary.cases[0].repetitions.total, repetitions);
      assert.equal(summary.cases[0].repetitions.success_count, bad ? 0 : repetitions);
      const taskCalls = readCalls().slice(firstCall).filter(call => call.id === task.id);
      assert.equal(taskCalls.length, task.prompts.length * repetitions);
      for (let attempt = 0; attempt < repetitions; attempt++) {
        const attemptDirectory = attempt === 0 ? caseDirectory : path.join(caseDirectory, 'repetitions', `sample-${attempt + 1}`);
        checkResults(read(path.join(attemptDirectory, 'checks.json')), task, !bad);
        assert.equal(fs.readFileSync(path.join(attemptDirectory, 'exit-code'), 'utf8').trim(), '0');
        const calls = taskCalls.slice(attempt * task.prompts.length, (attempt + 1) * task.prompts.length);
        assert.equal(calls[0].requested, null);
        assert.deepEqual(calls.map(call => call.prompt), task.prompts);
        assert.deepEqual(calls.map(call => call.turn), task.prompts.map((_, index) => index + 1));
        for (const call of calls) {
          assert.equal(call.workdir, path.join(attemptDirectory, 'workdir'));
          assert.equal(call.sessionID, calls[0].sessionID);
          assert.equal(call.home, calls[0].home);
          assert(!fs.existsSync(call.home), 'candidate HOME retained');
        }
        assert.deepEqual(calls[0].initial, snapshot(path.join(caseDirectory, 'inputs')), 'attempt did not start from prepared inputs');
        if (attempt > 0) assert.notEqual(calls[0].sessionID, taskCalls[0].sessionID);
        if (task.yaml.turns) {
          assert.equal(calls[1].requested, calls[0].sessionID);
          const turns = read(path.join(attemptDirectory, 'turns.json'));
          assert.equal(turns.length, task.prompts.length);
          assert(turns.every(turn => turn.exit_code === 0 && turn.session_id === calls[0].sessionID));
          const transcripts = turns.map((_, index) => fs.readFileSync(path.join(attemptDirectory, 'turns', String(index + 1), 'transcript.jsonl'), 'utf8')).join('');
          assert.equal(fs.readFileSync(path.join(attemptDirectory, 'transcript.jsonl'), 'utf8'), transcripts);
        }
      }
    }
    assert.deepEqual([...saved.keys()].sort(), selected.map(task => task.id).sort());
    assert.equal(readCalls().length - firstCall, selected.reduce((sum, task) => sum + task.prompts.length * repetitions, 0));
    console.log(`PASS runner ${bad ? 'broken' : 'reference'} ${split}: exactly ${count} tasks, exit ${bad ? 12 : 0}`);
    return saved;
  }
  try {
    fs.mkdirSync(path.join(temp, 'bin'));
    fs.mkdirSync(env.HOME);
    const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
    fs.writeFileSync(path.join(temp, 'bin/opencode'), `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(__filename)} --candidate "$@"\n`, { mode: 0o755 });
    for (const name of ['forbidden', 'curl', 'wget', 'docker', 'npx']) {
      fs.writeFileSync(path.join(temp, 'bin', name), '#!/bin/sh\nprintf "%s\\n" "$0" >> "$CORPUS_TEST_FORBIDDEN"\nexit 99\n', { mode: 0o755 });
    }
    const development = selection([], 'development');
    const heldout = selection(['--split=heldout'], 'heldout');
    for (const id of ['verification-note', 'path-migration']) {
      const task = tasks.find(task => task.id === id);
      const directory = development.get(id) || heldout.get(id);
      const before = snapshot(directory);
      const callsBefore = readCalls();
      const result = command('regrade.sh', [`--run=${path.basename(directory)}`, `--case=${id}`], 0);
      const reportPath = /regrade report: (.*\/report.json)/.exec(result.stdout)?.[1];
      assert(reportPath, 'missing regrade report');
      const report = read(reportPath);
      assert.equal(report.suite, 'workflow');
      assert.deepEqual(report.manual_review, task.manualReview);
      assert.equal(report.candidate_invoked, false);
      assert.equal(report.passed, true);
      assert.equal(report.attempts.length, 2);
      assert.deepEqual(readCalls(), callsBefore, 'regrade called candidate');
      assert.deepEqual(snapshot(directory), before, 'regrade changed source attempt evidence');
      for (const attempt of report.attempts) {
        checkResults(attempt, task, true);
        const copied = path.join(path.dirname(reportPath), attempt.directory, 'workdir');
        if (id === 'path-migration') {
          assert.deepEqual(read(path.join(copied, 'startup.json')), { setupRoot: 'new-setup', editor: 'fixture-editor' });
          assert.equal(fs.readlinkSync(path.join(copied, 'home/tool')), '../new-setup/tool.txt');
          assert.equal(fs.realpathSync(path.join(copied, 'home/tool')), path.join(copied, 'new-setup/tool.txt'));
          assert.equal(fs.readlinkSync(path.join(copied, 'home/personal')), '../other-project/notes.txt');
        }
      }
      console.log(`PASS regrade ${id}: two saved attempts, no candidate, source unchanged`);
    }
    selection([], 'development', true);
    selection(['--split=heldout'], 'heldout', true);
    assert(!fs.existsSync(env.CORPUS_TEST_FORBIDDEN), 'external service command invoked');
    assert.deepEqual(snapshot(corpus), sourceBefore, 'runner changed corpus sources');
    console.log('PASS real corpus runner: 8 references, 8 broken variants, 2 repeated multi-turn regrades. Fake candidates only; no model-quality score.');
    success = true;
  } finally {
    if (success) fs.rmSync(temp, { recursive: true, force: true });
    else console.error(`Runner test evidence retained at ${temp}`);
  }
}

try {
  if (process.argv[2] === '--candidate') candidate();
  else main();
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}
