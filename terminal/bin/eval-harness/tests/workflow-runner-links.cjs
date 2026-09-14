const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { prepare } = require('./workflow-runner-patch.cjs');

const root = path.resolve(__dirname, '..');
const corpus = path.join(root, 'workflows');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-links-'));
const pkg = path.join(work, 'package');
const scripts = path.join(pkg, 'scripts/eval');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(name, content, mode = 0o644) {
  const file = path.join(work, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode });
  return file;
}
const env = {
  ...process.env, PATH: `${work}/bin:${root}/shims:${process.env.PATH}`, HOME: `${work}/home`,
  OPENCODE_SKILLS_ROOT: `${work}/skills`, OPENCODE_SKILLS_EXTRA_ROOT: '', OPENCODE_AUTH_FILE: '',
  OPENCODE_REAL_BIN: `${work}/bin/forbidden`, EVAL_STATE_DIR: `${work}/state`,
  EVAL_WORKFLOWS_ROOT: `${work}/workflows`, EVAL_SUITE: 'regression', EVAL_EVALS_DIR: '',
  EVAL_SKIP_AUTH_CHECK: '1', EVAL_RUNNER: 'host', EVAL_MODEL: 'fake/model', EVAL_MODE: 'full',
  EVAL_MAX_SECONDS: '10', EVAL_SETUP_MAX_SECONDS: '5', EVAL_CHECK_TIMEOUT_SECONDS: '30',
  EVAL_REPETITIONS: '1', EVAL_STABILITY_SAMPLES: '1', EVAL_LLM_JUDGE_LIVE: '0',
  EVAL_AUTOFIX: '0', EVAL_BYPASS: '0', EVAL_WARN_ONLY: '0', SETUP_LOG: `${work}/setups`,
};
function command(executable, args, extra = {}) {
  const result = spawnSync(executable, args, { cwd: work, env: { ...env, ...extra }, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.signal, null, `${result.stdout}\n${result.stderr}`);
  return result;
}
function status(result, expected = 0) {
  assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`);
  return result;
}
function workflow(id, extra = {}) {
  return status(command('bash', [path.join(scripts, 'workflow.sh'), `--case=${id}`, '--repetitions=2'], extra));
}
function runDir(result) { return path.join(env.EVAL_STATE_DIR, 'runs', /run_id=([^\s]+)/.exec(result.stdout)[1]); }
function regrade(run, id, extra = {}) {
  return command('bash', [path.join(scripts, 'regrade.sh'), `--run=${path.basename(run)}`, `--case=${id}`], extra);
}
function copy(source, destination, flags = []) {
  return command('python3', [path.join(scripts, 'lib/copy_inputs.py'), source, destination, ...flags]);
}
function seal(run) { return command('python3', [path.join(scripts, 'lib/evidence.py'), 'seal', run, 'demo']); }

try {
  prepare(pkg);
  for (const name of ['forbidden', 'curl', 'wget', 'docker']) write(`bin/${name}`, '#!/bin/sh\nexit 99\n', 0o755);
  write('skills/demo/SKILL.md', 'Use the requested fixture.');
  write('skills/code-standards/SKILL.md', 'Use the requested fixture.');
  write('workflows/index.json', JSON.stringify({ schema_version: 1, tasks: [{ id: 'links', skill: 'demo', split: 'development', source: 'test-only', description: 'Prepared links' }] }));
  write('workflows/tasks/links/cases/links.yaml', JSON.stringify({ id: 'links', turns: ['first', 'second'],
    setup: { script: 'setup.sh' }, checks: [{ kind: 'shell', unsafe_shell: true,
      cmd: 'test -L broken && test -L loop-a && readlink file-link', expect_exact: 'data/other' }] }));
  write('workflows/tasks/links/setup.sh', `set -eu
printf 'setup\n' >> "$SETUP_LOG"
mkdir data
printf original > data/original
printf other > data/other
ln -s data/original file-link
ln -s data dir-link
ln -s absent/child broken
ln -s loop-b loop-a
ln -s loop-a loop-b
ln -s growth/child growth
ln -s . self-directory
ln -s .. data/up
`);
  const fake = write('bin/opencode', `#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('fake'); process.exit(0); }
const previous = args.indexOf('--session');
const home = path.join(process.env.HOME, 'session');
let session;
function success(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
if (previous < 0) {
  assert.ok(!fs.existsSync(home));
  session = 'ses_' + randomUUID();
  fs.writeFileSync(home, session);
  if (process.env.REFERENCE_DIR) {
    assert.equal(fs.readlinkSync('home/tool'), '../old-setup/tool.txt');
    assert.equal(fs.readlinkSync('home/personal'), '../other-project/notes.txt');
    for (const name of fs.readdirSync(process.env.REFERENCE_DIR)) {
      if (!['prepare.sh', 'bad.json'].includes(name)) fs.copyFileSync(path.join(process.env.REFERENCE_DIR, name), name);
    }
    success('node', ['migrate.cjs', 'new-setup/repo']);
  } else {
    assert.equal(fs.readlinkSync('file-link'), 'data/original');
    assert.equal(fs.readlinkSync('broken'), 'absent/child');
    assert.equal(fs.readlinkSync('loop-a'), 'loop-b');
    assert.equal(fs.readlinkSync('growth'), 'growth/child');
    fs.unlinkSync('file-link');
    fs.symlinkSync('data/other', 'file-link');
  }
} else {
  session = fs.readFileSync(home, 'utf8');
  assert.equal(args[previous + 1], session);
  if (process.env.REFERENCE_DIR) success('bash', [path.join(process.env.REFERENCE_DIR, 'prepare.sh')]);
  else assert.equal(fs.readlinkSync('file-link'), 'data/other');
}
console.log(JSON.stringify({ type: 'text', sessionID: session, part: { text: 'reference fixture output' } }));
console.log(JSON.stringify({ type: 'step_finish', sessionID: session, part: { reason: 'stop', cost: 0, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } } } }));
`, 0o755);

  const synthetic = runDir(workflow('links'));
  assert.equal(fs.readFileSync(env.SETUP_LOG, 'utf8'), 'setup\n', 'setup runs once, not once per repetition');
  const expectedLinks = { 'dir-link': 'data', broken: 'absent/child', 'loop-a': 'loop-b', 'loop-b': 'loop-a', growth: 'growth/child', 'self-directory': '.', 'data/up': '..' };
  for (const directory of ['inputs', 'workdir', 'repetitions/sample-2/workdir']) {
    for (const [name, target] of Object.entries(expectedLinks)) {
      assert.equal(fs.readlinkSync(path.join(synthetic, 'links', directory, name)), target);
    }
  }
  assert.equal(fs.readlinkSync(path.join(synthetic, 'links/inputs/file-link')), 'data/original');
  assert.deepEqual(json(path.join(synthetic, 'evidence.json')).files['links/workdir/file-link'], { symlink: 'data/other' });
  const graded = status(regrade(synthetic, 'links'));
  const report = /regrade report: (.*\/report.json)/.exec(graded.stdout)[1];
  assert.equal(json(report).passed, true);
  for (const directory of ['source/links/workdir', 'attempts/1/workdir', 'attempts/2/workdir']) {
    for (const [name, target] of Object.entries(expectedLinks)) assert.equal(fs.readlinkSync(path.join(path.dirname(report), directory, name)), target);
  }

  const inputs = path.join(synthetic, 'links/inputs');
  const copied = path.join(work, 'copied');
  status(copy(inputs, copied));
  status(copy(inputs, copied));
  assert.equal(fs.readlinkSync(path.join(copied, 'growth')), 'growth/child');
  assert.notEqual(copy(inputs, path.join(work, 'skill-copy'), ['--skill']).status, 0);
  fs.symlinkSync(copied, path.join(work, 'linked-destination'));
  assert.notEqual(copy(inputs, path.join(work, 'linked-destination')).status, 0);
  write('outside/child', 'must stay unchanged');
  const preexisting = path.join(work, 'preexisting');
  fs.mkdirSync(preexisting);
  fs.symlinkSync(path.join(work, 'outside'), path.join(preexisting, 'absent'));
  assert.notEqual(copy(inputs, preexisting).status, 0, 'a broken link cannot acquire an outside target at the destination');
  assert.equal(fs.readFileSync(path.join(work, 'outside/child'), 'utf8'), 'must stay unchanged');

  // Each bad tree is checked both while copying inputs and while sealing output.
  const mutations = [
    directory => fs.symlinkSync('/tmp', path.join(directory, 'escape')),
    directory => fs.symlinkSync('../outside', path.join(directory, 'escape')),
    directory => fs.symlinkSync('data/up/../outside', path.join(directory, 'escape')),
    directory => {
      fs.symlinkSync('/tmp', path.join(directory, 'outside-alias'));
      fs.symlinkSync('outside-alias/file', path.join(directory, 'escape'));
    },
    directory => status(command('mkfifo', [path.join(directory, 'pipe')])),
    directory => {
      for (let index = 0; index < 42; index++) fs.symlinkSync(`chain-${index + 1}`, path.join(directory, `chain-${index}`));
    },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const clone = path.join(work, `unsafe-${index}`, path.basename(synthetic));
    fs.cpSync(synthetic, clone, { recursive: true, verbatimSymlinks: true });
    const directory = path.join(clone, 'links/workdir');
    mutate(directory);
    assert.notEqual(copy(directory, path.join(work, `unsafe-copy-${index}`)).status, 0);
    fs.unlinkSync(path.join(clone, 'evidence.json'));
    assert.notEqual(seal(clone).status, 0);
  }
  for (const [index, name] of ['results.json', '.finished', 'links/transcript.jsonl', 'links/case.yaml', 'links/env-manifest.json', 'links/workdir', 'links/inputs', 'links/sandbox'].entries()) {
    const clone = path.join(work, `control-${index}`, path.basename(synthetic));
    fs.cpSync(synthetic, clone, { recursive: true, verbatimSymlinks: true });
    fs.rmSync(path.join(clone, name), { recursive: true, force: true });
    fs.symlinkSync('links/workdir', path.join(clone, name));
    fs.unlinkSync(path.join(clone, 'evidence.json'));
    assert.notEqual(seal(clone).status, 0, name);
  }
  const crossTree = path.join(work, 'cross-tree', path.basename(synthetic));
  fs.cpSync(synthetic, crossTree, { recursive: true, verbatimSymlinks: true });
  fs.symlinkSync('../../../inputs/data/original', path.join(crossTree, 'links/repetitions/sample-2/workdir/cross-tree'));
  fs.unlinkSync(path.join(crossTree, 'evidence.json'));
  assert.notEqual(seal(crossTree).status, 0, 'links cannot cross from a repetition into another saved tree');
  const link = path.join(synthetic, 'links/workdir/file-link');
  fs.unlinkSync(link);
  fs.symlinkSync('data/original', link);
  assert.match(status(regrade(synthetic, 'links'), 13).stderr, /checksum mismatch/);

  // Explicit heldout reference verification, not a model score or tuning run.
  const realEnv = { EVAL_WORKFLOWS_ROOT: corpus, REFERENCE_DIR: path.join(corpus, 'references/path-migration') };
  const actual = runDir(workflow('path-migration', realEnv));
  const actualResults = json(path.join(actual, 'results.json'));
  assert.equal(actualResults.workflow.split, 'heldout');
  assert.equal(actualResults.cases[0].repetitions.success_count, 2);
  const evidence = json(path.join(actual, 'evidence.json'));
  assert.deepEqual(evidence.files['path-migration/inputs/home/tool'], { symlink: '../old-setup/tool.txt' });
  assert.deepEqual(evidence.files['path-migration/workdir/home/tool'], { symlink: '../new-setup/tool.txt' });
  assert.deepEqual(evidence.files['path-migration/repetitions/sample-2/workdir/home/tool'], { symlink: '../new-setup/tool.txt' });
  fs.unlinkSync(fake);
  const actualGraded = status(regrade(actual, 'path-migration', realEnv));
  const actualReport = json(/regrade report: (.*\/report.json)/.exec(actualGraded.stdout)[1]);
  assert.equal(actualReport.passed, true);
  assert.equal(actualReport.candidate_invoked, false);
  assert.equal(actualReport.attempts.length, 2);
  console.log('PASS: confined links, broken links/cycles, copy retries, unsafe paths, target seals, and heldout path-migration reference regrade');
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
