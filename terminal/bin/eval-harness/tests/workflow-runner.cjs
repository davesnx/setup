const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { prepare } = require('./workflow-runner-patch.cjs');

const root = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-runner-'));
const pkg = path.join(work, 'package');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(name, content, mode = 0o644) {
  const file = path.join(work, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode });
  return file;
}
const env = {
  ...process.env, PATH: `${work}/bin:${root}/shims:${process.env.PATH}`,
  HOME: `${work}/home`, OPENCODE_SKILLS_ROOT: `${work}/skills`, OPENCODE_SKILLS_EXTRA_ROOT: '',
  OPENCODE_AUTH_FILE: '', EVAL_STATE_DIR: `${work}/state`, EVAL_WORKFLOWS_ROOT: `${work}/workflows`,
  EVAL_SKIP_AUTH_CHECK: '1', EVAL_LLM_JUDGE_LIVE: '0', EVAL_RUNNER: 'host', EVAL_AUTOFIX: '0',
  EVAL_REPETITIONS: '1', EVAL_STABILITY_SAMPLES: '1', EVAL_MODE: 'full', EVAL_MAX_SECONDS: '5',
  EVAL_BYPASS: '0', EVAL_WARN_ONLY: '0', EVAL_MODEL: 'fake/model', EVAL_SUITE: 'regression',
  EVAL_EVALS_DIR: '', EVAL_CASE_MODEL: '', CALL_LOG: `${work}/calls.jsonl`, SETUP_LOG: `${work}/setups`,
  OPENCODE_REAL_BIN: `${work}/bin/forbidden`, TIMEOUT_MARKER: `${work}/timeout-child`,
};
function command(script, args, extra = {}) {
  const result = spawnSync('bash', [path.join(pkg, 'scripts/eval', script), ...args], {
    cwd: work, env: { ...env, ...extra }, encoding: 'utf8', timeout: 120000,
  });
  assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
  return result;
}
function status(result, expected) {
  assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`);
  return result;
}
function workflow(args = [], extra = {}) { return command('workflow.sh', args, extra); }
function runs(result) {
  return [...result.stdout.matchAll(/run_id=([^\s]+)/g)].map(match => path.join(env.EVAL_STATE_DIR, 'runs', match[1]));
}
function calls() {
  return fs.existsSync(env.CALL_LOG) ? fs.readFileSync(env.CALL_LOG, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
}
function setups() { return fs.existsSync(env.SETUP_LOG) ? fs.readFileSync(env.SETUP_LOG, 'utf8').trim().split('\n').length : 0; }
const tasks = [
  { id: 'development-pass', skill: 'demo', split: 'development', source: 'PRIVATE provenance', description: 'A passing workflow' },
  { id: 'development-fail', skill: 'demo', split: 'development', source: 'PRIVATE other source', description: 'A failing workflow' },
  { id: 'heldout-only', skill: 'demo', split: 'heldout', source: 'PRIVATE heldout source', description: 'Heldout workflow' },
];
const manifest = value => write('workflows/index.json', JSON.stringify(value));
function caseData(id = tasks[0].id, fields = {}) {
  const data = { id, turns: ['begin', 'finish: FUTURE_SECRET'], setup: { script: 'setup.sh', fixtures: { 'seed.txt': 'fixtures/seed.txt' } },
    checks: [{ kind: 'file_exists', path: id === 'development-fail' ? 'missing.txt' : 'answer.txt' }], ...fields };
  write(`workflows/tasks/${id}/cases/${id}.yaml`, JSON.stringify(data));
  return data;
}
function regrade(run, extra = {}) {
  return command('regrade.sh', [`--run=${path.basename(run)}`, '--case=development-pass'], extra);
}
function report(result) { return read(/regrade report: (.*\/report.json)/.exec(result.stdout)[1]); }

try {
  prepare(pkg);
  for (const name of ['forbidden', 'curl', 'wget', 'docker']) {
    write(`bin/${name}`, '#!/bin/sh\nprintf "Unexpected external command: %s\\n" "$0" >&2\nexit 99\n', 0o755);
  }
  write('skills/demo/SKILL.md', 'Follow the user request.');
  for (const task of tasks) {
    write(`workflows/tasks/${task.id}/fixtures/seed.txt`, 'original\n');
    write(`workflows/tasks/${task.id}/setup.sh`, `set -eu
printf 'setup\n' >> "$SETUP_LOG"
git init -q
git config user.email fixture@example.invalid
git config user.name Fixture
git add seed.txt
git commit -qm initial
printf 'dirty\n' >> seed.txt
printf 'staged\n' > staged.txt
git add staged.txt
printf 'untracked\n' > untracked.txt
`);
    caseData(task.id);
  }
  manifest({ schema_version: 1, tasks });
  const fake = write('bin/opencode', `#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('fake-opencode'); process.exit(0); }
assert.equal(args[0], 'run');
const prompt = args.at(-1);
const sidIndex = args.indexOf('--session');
const requested = sidIndex === -1 ? null : args[sidIndex + 1];
const home = process.env.HOME;
const sessionFile = path.join(home, 'session.json');
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({ args, prompt, requested, home, workdir: process.cwd() }) + '\\n');
for (const key of ['EVAL_WORKFLOWS_ROOT', 'EVAL_EVALS_DIR', 'EVAL_WORKFLOW_METADATA', 'EVAL_FIXTURE_DIR']) assert.equal(process.env[key], undefined, key);
assert.ok(!JSON.stringify({ args, env: process.env }).includes('PRIVATE'));
let session;
if (requested === null) {
  assert.ok(!fs.existsSync(sessionFile));
  assert.ok(!prompt.includes('FUTURE_SECRET'));
  assert.equal(fs.readFileSync('seed.txt', 'utf8'), 'original\\ndirty\\n');
  assert.equal(fs.readFileSync('untracked.txt', 'utf8'), 'untracked\\n');
  const git = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  assert.equal(git.status, 0, git.stderr);
  assert.equal(git.stdout, ' M seed.txt\\nA  staged.txt\\n?? untracked.txt\\n');
  session = 'ses_' + randomUUID();
  fs.writeFileSync(sessionFile, JSON.stringify({ session, workdir: process.cwd() }));
  fs.writeFileSync('seed.txt', 'changed in first turn\\n');
  fs.unlinkSync('untracked.txt');
  fs.writeFileSync('first-turn.txt', session);
} else {
  const saved = JSON.parse(fs.readFileSync(sessionFile));
  assert.equal(requested, saved.session);
  assert.equal(process.cwd(), saved.workdir);
  assert.equal(fs.readFileSync('first-turn.txt', 'utf8'), requested);
  assert.equal(fs.readFileSync('seed.txt', 'utf8'), 'changed in first turn\\n');
  assert.ok(!fs.existsSync('untracked.txt'));
  session = requested;
}
if (prompt === 'candidate-error') process.exit(29);
if (prompt === 'changed-session') session = 'ses_wrong';
if (prompt === 'spawn-timeout') {
  spawn(process.execPath, ['-e', 'setTimeout(() => require("node:fs").writeFileSync(process.env.TIMEOUT_MARKER, "escaped"), 2000)'], { stdio: 'ignore' }).unref();
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
}
if (prompt === 'slow') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
fs.writeFileSync('answer.txt', 'answer\\n');
const identity = prompt === 'missing-session' ? {} : { sessionID: session };
console.log(JSON.stringify({ type: 'text', ...identity, part: { text: prompt } }));
if (prompt !== 'incomplete') console.log(JSON.stringify({ type: 'step_finish', ...identity, part: { reason: 'stop', cost: 0.01, tokens: { input: 1, output: 2, reasoning: 0, cache: { read: 0, write: 0 } } } }));
`, 0o755);

  const dry = status(workflow(['--dry-run']), 0);
  assert.match(dry.stdout, /development-pass/);
  assert.match(dry.stdout, /development-fail/);
  assert.doesNotMatch(dry.stdout, /heldout-only/);
  assert.equal(calls().length, 0);
  assert.equal(setups(), 0);
  assert.ok(!fs.existsSync(env.EVAL_STATE_DIR));
  status(workflow(['--case=development-pass', '--split=development', '--dry-run']), 2);
  for (const option of ['--split=all', '--case=', '--repetitions=0', '--repetitions=21', '--mode=2tier', '--max-seconds=0', '--max-seconds=3601', '--unknown']) {
    assert.notEqual(workflow([option, '--dry-run']).status, 0, option);
  }

  const repeated = status(workflow(['--case=development-pass', '--repetitions=2', '--debug', '--model=fake/model with spaces;$(false)']), 0);
  const savedRun = runs(repeated)[0];
  const saved = read(path.join(savedRun, 'results.json'));
  assert.equal(saved.suite, 'workflow');
  assert.deepEqual(saved.workflow, tasks[0]);
  assert.match(fs.readFileSync(path.join(savedRun, 'diff.md'), 'utf8'), /suite: `workflow`/);
  assert.match(fs.readFileSync(path.join(savedRun, 'diff.md'), 'utf8'), /split: `development`/);
  assert.equal(saved.cases[0].repetitions.success_count, 2);
  assert.equal(saved.cases[0].metrics.tokens.input, 4);
  assert.equal(setups(), 1);
  const log = calls();
  assert.equal(log.length, 4);
  assert.equal(log[0].requested, null);
  assert.equal(log[2].requested, null);
  assert.notEqual(log[1].requested, log[3].requested);
  assert.equal(log[0].home, log[1].home);
  assert.equal(log[2].home, log[3].home);
  assert.notEqual(log[0].home, log[2].home);
  assert.equal(log[1].prompt, 'finish: FUTURE_SECRET');
  assert.ok(log[0].args.includes('fake/model with spaces;$(false)'));
  for (const item of log) assert.ok(!fs.existsSync(item.home), 'runtime HOME must be removed');
  for (const attempt of ['', 'repetitions/sample-2']) {
    const directory = path.join(savedRun, 'development-pass', attempt);
    const turns = read(path.join(directory, 'turns.json'));
    assert.deepEqual(turns.map(turn => turn.exit_code), [0, 0]);
    assert.equal(turns[0].session_id, turns[1].session_id);
    assert.equal(fs.readFileSync(path.join(directory, 'transcript.jsonl'), 'utf8'), [1, 2].map(n => fs.readFileSync(path.join(directory, `turns/${n}/transcript.jsonl`), 'utf8')).join(''));
  }
  assert.ok(fs.existsSync(path.join(savedRun, 'development-pass/inputs/.git/index')));
  assert.equal(fs.readFileSync(path.join(savedRun, 'development-pass/inputs/seed.txt'), 'utf8'), 'original\ndirty\n');
  const history = fs.readFileSync(path.join(env.EVAL_STATE_DIR, 'history.ndjson'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(history[0].suite, 'workflow');
  assert.deepEqual(history[0].workflow, tasks[0]);

  const mixed = status(workflow(), 12);
  assert.match(mixed.stdout, /\[workflow\] PASS \(1\): development-pass/);
  assert.match(mixed.stdout, /\[workflow\] FAIL \(1\): development-fail/);
  assert.doesNotMatch(mixed.stdout, /heldout-only/);
  assert.equal(runs(mixed).length, 2);
  status(workflow(['--case=heldout-only']), 0);
  status(workflow(['--split=heldout', '--dry-run']), 0);

  const metadataPath = path.join(work, 'workflows/tasks/development-pass/metadata.json');
  const metadata = { manual_review: true, artifact: 'answer.txt', criteria: ['MANUAL_PRIVATE reasoning review'] };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));
  const manual = status(workflow(['--case=development-pass']), 0);
  assert.match(manual.stdout, /PENDING MANUAL REVIEW \(1; automatic checks passed\): development-pass/);
  assert.match(manual.stdout, /\[workflow\] PASS \(0\): none/);
  const manualRun = runs(manual)[0];
  const manualResult = read(path.join(manualRun, 'results.json'));
  assert.equal(manualResult.verdict, 'PASS', 'verdict remains the automatic check result');
  assert.deepEqual(manualResult.workflow, tasks[0]);
  assert.deepEqual(manualResult.manual_review, { required: true, status: 'pending', artifact: metadata.artifact, criteria: metadata.criteria });
  assert.match(fs.readFileSync(path.join(manualRun, 'diff.md'), 'utf8'), /PENDING MANUAL REVIEW/);
  assert.match(fs.readFileSync(path.join(manualRun, 'diff.md'), 'utf8'), /MANUAL_PRIVATE reasoning review/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(env.EVAL_STATE_DIR, 'history.ndjson'), 'utf8').trim().split('\n').at(-1)).manual_review, manualResult.manual_review);
  const callsBeforeMetadataErrors = calls().length;
  for (const bad of [{}, { ...metadata, manual_review: 'true' }, { ...metadata, artifact: '../answer.txt' }, { ...metadata, artifact: '/tmp/answer.txt' }, { ...metadata, artifact: '.' }, { ...metadata, criteria: [] }, { ...metadata, criteria: [4] }, { ...metadata, extra: true }]) {
    fs.writeFileSync(metadataPath, JSON.stringify(bad));
    status(workflow(['--case=development-pass']), 13);
  }
  fs.unlinkSync(metadataPath);
  fs.symlinkSync('fixtures/seed.txt', metadataPath);
  assert.match(status(workflow(['--case=development-pass']), 13).stderr, /metadata cannot be a link/);
  fs.unlinkSync(metadataPath);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));
  caseData(undefined, { setup: { fixtures: { 'private.json': 'metadata.json' } } });
  assert.match(status(workflow(['--case=development-pass']), 13).stderr, /cannot be a candidate fixture/);
  fs.unlinkSync(metadataPath);
  caseData();
  assert.equal(calls().length, callsBeforeMetadataErrors);
  const indexPath = path.join(work, 'workflows/index.json');
  const indexText = fs.readFileSync(indexPath);
  write('index-copy.json', indexText);
  fs.unlinkSync(indexPath);
  fs.symlinkSync('../index-copy.json', indexPath);
  assert.match(status(workflow(['--dry-run']), 13).stderr, /index cannot be a link/);
  fs.unlinkSync(indexPath);
  fs.writeFileSync(indexPath, indexText);
  const yamlPath = path.join(work, 'workflows/tasks/development-pass/cases/development-pass.yaml');
  fs.renameSync(yamlPath, path.join(path.dirname(yamlPath), 'linked-case.yaml'));
  fs.symlinkSync('linked-case.yaml', yamlPath);
  assert.match(status(workflow(['--dry-run']), 13).stderr, /control directories cannot be links/);
  fs.unlinkSync(yamlPath);
  fs.renameSync(path.join(path.dirname(yamlPath), 'linked-case.yaml'), yamlPath);

  const beforeErrors = calls().length;
  const beforeSetupErrors = setups();
  status(workflow(['--case=development-pass'], { EVAL_RUNNER: 'docker' }), 13);
  assert.equal(calls().length, beforeErrors);
  assert.equal(setups(), beforeSetupErrors);
  write('workflows/tasks/development-pass/broken.sh', 'printf "failed\\n" >> "$SETUP_LOG"\nexit 7\n');
  caseData(undefined, { setup: { script: 'broken.sh' } });
  status(workflow(['--case=development-pass']), 13);
  assert.equal(calls().length, beforeErrors);
  write('workflows/tasks/development-pass/slow-setup.sh', 'sleep 10\n');
  caseData(undefined, { setup: { script: 'slow-setup.sh' } });
  assert.match(status(workflow(['--case=development-pass'], { EVAL_SETUP_MAX_SECONDS: '1' }), 13).stderr, /setup failed \(exit 124\)/);
  status(workflow(['--case=development-pass'], { EVAL_SETUP_MAX_SECONDS: '0' }), 13);
  assert.equal(calls().length, beforeErrors);
  for (const fields of [{ prompt: 'ambiguous' }, { turns: [] }, { turns: [''] }, { turns: ['begin', 1] }, { turns: 'not an array' }, { turns: null }, { setup: { script: '../outside.sh' } }, { setup: { fixtures: { '../escape': 'fixtures/seed.txt' } } }, { setup: { fixtures: { 'seed.txt': '/etc/hosts' } } }]) {
    caseData(undefined, fields);
    status(workflow(['--case=development-pass']), 13);
  }
  const promptOnly = caseData();
  delete promptOnly.turns;
  for (const prompt of [undefined, '', '  ', 12, null]) {
    write('workflows/tasks/development-pass/cases/development-pass.yaml', JSON.stringify({ ...promptOnly, prompt }));
    status(workflow(['--case=development-pass']), 13);
  }
  assert.equal(calls().length, beforeErrors);
  caseData();
  for (const value of [{ schema_version: 2, tasks }, { schema_version: 1, tasks: [...tasks, tasks[0]] }, { schema_version: 1, tasks: [{ ...tasks[0], skip: true }] }, { schema_version: 1, tasks: [{ ...tasks[0], id: '../escape' }] }, { schema_version: 1, tasks: [{ ...tasks[0], split: 'test' }] }, { schema_version: 1, tasks: [{ ...tasks[0], source: '' }] }]) {
    manifest(value);
    status(workflow(['--dry-run']), 13);
  }
  manifest({ schema_version: 1, tasks });
  for (const [turns, expectedCalls, code] of [
    [['begin', 'candidate-error', 'never'], 2, 29],
    [['missing-session', 'never'], 1, 13],
    [['begin', 'changed-session', 'never'], 2, 13],
    [['incomplete', 'never'], 1, 13],
  ]) {
    caseData(undefined, { turns });
    const count = calls().length;
    const result = status(workflow(['--case=development-pass']), 13);
    assert.equal(calls().length - count, expectedCalls);
    assert.equal(fs.readFileSync(path.join(runs(result)[0], 'development-pass/exit-code'), 'utf8').trim(), String(code));
  }
  caseData(undefined, { turns: ['slow', 'slow', 'never'] });
  const count = calls().length;
  const timed = status(workflow(['--case=development-pass', '--max-seconds=2']), 13);
  const timedAttempt = path.join(runs(timed)[0], 'development-pass');
  assert.equal(calls().length - count, 2);
  assert.equal(fs.readFileSync(path.join(timedAttempt, 'exit-code'), 'utf8').trim(), '124');
  assert.deepEqual(read(path.join(timedAttempt, 'turns.json')).map(turn => turn.exit_code), [0, 124]);
  assert.ok(read(path.join(timedAttempt, 'turns.json')).reduce((sum, turn) => sum + turn.elapsed_ms, 0) < 3000);
  caseData(undefined, { turns: ['spawn-timeout', 'never'] });
  status(workflow(['--case=development-pass', '--max-seconds=1']), 13);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2200);
  assert.ok(!fs.existsSync(env.TIMEOUT_MARKER), 'timeout must stop candidate tool descendants');
  caseData();

  // Regression discovery intentionally permits prompt-less placeholder cases.
  write('skills/demo/evals/cases/discovery.yaml', '{"id":"discovery","checks":[]}');
  status(command('run.sh', ['--skill=demo', '--dry-run']), 0);
  status(command('run.sh', ['--skill=demo']), 13);
  fs.unlinkSync(path.join(work, 'skills/demo/evals/cases/discovery.yaml'));
  const single = caseData();
  delete single.turns;
  single.prompt = 'begin';
  write('workflows/tasks/development-pass/cases/development-pass.yaml', JSON.stringify(single));
  const singleRun = runs(status(workflow(['--case=development-pass']), 0))[0];
  assert.ok(!fs.existsSync(path.join(singleRun, 'development-pass/turns.json')));

  const setupCount = setups();
  const callCount = calls().length;
  fs.unlinkSync(fake);
  const nextRoot = path.join(work, 'current-workflows');
  fs.cpSync(env.EVAL_WORKFLOWS_ROOT, nextRoot, { recursive: true });
  fs.writeFileSync(path.join(nextRoot, 'index.json'), JSON.stringify({ schema_version: 1, tasks: tasks.map(task => ({ ...task, source: 'updated provenance' })) }));
  const nextCase = path.join(nextRoot, 'tasks/development-pass/cases/development-pass.yaml');
  fs.writeFileSync(nextCase, JSON.stringify({ ...single, setup: { script: 'does-not-exist.sh' }, checks: [{ kind: 'file_exists', path: 'missing.txt' }] }));
  const gradingEnv = { EVAL_WORKFLOWS_ROOT: nextRoot };
  const graded = report(status(regrade(savedRun, gradingEnv), 12));
  assert.equal(graded.suite, 'workflow');
  assert.deepEqual(graded.workflow, tasks[0]);
  assert.equal(graded.candidate_invoked, false);
  assert.equal(graded.attempts.length, 2);
  fs.writeFileSync(nextCase, JSON.stringify({ ...single, setup: { script: 'does-not-exist.sh' }, checks: [
    ...single.checks,
    { kind: 'shell', unsafe_shell: true, cmd: 'test -f ../turns.json && test -f ../turns/2/transcript.jsonl && printf turns-ready', expect_exact: 'turns-ready' },
  ] }));
  assert.equal(report(status(regrade(savedRun, gradingEnv), 0)).passed, true);
  const currentMetadata = path.join(nextRoot, 'tasks/development-pass/metadata.json');
  fs.writeFileSync(currentMetadata, JSON.stringify({ manual_review: true, artifact: 'answer.txt', criteria: ['Current review criteria'] }));
  const currentReview = status(regrade(savedRun, gradingEnv), 0);
  assert.match(currentReview.stdout, /PENDING MANUAL REVIEW/);
  assert.deepEqual(report(currentReview).manual_review, { required: true, status: 'pending', artifact: 'answer.txt', criteria: ['Current review criteria'] });
  assert.deepEqual(report(currentReview).workflow, tasks[0], 'current review metadata must not replace original provenance');
  const currentMarkdown = fs.readFileSync(/regrade report: (.*\/report.json)/.exec(currentReview.stdout)[1].replace(/\.json$/, '.md'), 'utf8');
  assert.match(currentMarkdown, /automatic checks: PASS/);
  assert.match(currentMarkdown, /PENDING MANUAL REVIEW/);
  assert.match(currentMarkdown, /Current review criteria/);
  assert.match(currentMarkdown, /original source: PRIVATE provenance/);
  fs.unlinkSync(currentMetadata);
  assert.equal(report(status(regrade(manualRun, gradingEnv), 0)).manual_review, null, 'regrade uses current metadata, not the saved requirement');
  assert.equal(setups(), setupCount);
  assert.equal(calls().length, callCount);
  status(regrade(savedRun, { EVAL_WORKFLOWS_ROOT: `${work}/missing-root` }), 13);
  // A matching file seal alone cannot make broken session metadata valid.
  const turnFile = path.join(savedRun, 'development-pass/turns.json');
  const turns = read(turnFile);
  turns[1].session_id = 'ses_changed';
  fs.writeFileSync(turnFile, JSON.stringify(turns));
  status(regrade(savedRun, gradingEnv), 13);
  const sealPath = path.join(savedRun, 'evidence.json');
  const seal = read(sealPath);
  seal.files['development-pass/turns.json'] = createHash('sha256').update(fs.readFileSync(turnFile)).digest('hex');
  fs.writeFileSync(sealPath, JSON.stringify(seal));
  assert.match(status(regrade(savedRun, gradingEnv), 13).stderr, /session metadata/);
  console.log('PASS: workflow selection, setup, clean repetitions, native sessions, timeout/errors, and current-check regrade');
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
