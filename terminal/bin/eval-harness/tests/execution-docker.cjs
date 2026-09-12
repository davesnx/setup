const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const pkg = process.env.EVAL_TEST_PACKAGE || path.join(root, 'node_modules/@nano-step/eval-harness');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-docker-'));
const write = (name, contents, mode = 0o644) => {
  const file = path.join(work, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, { mode });
  return file;
};
const candidate = `#!/bin/sh
for argument do prompt="$argument"; done
test -f "$OPENCODE_CONFIG_DIR/skills/demo/SKILL.md" || exit 71
test -f "$OPENCODE_CONFIG_DIR/skills/demo/support.txt" || exit 71
test ! -e "$OPENCODE_CONFIG_DIR/skills/demo/evals" || exit 71
test -f "$HOME/.local/share/opencode/auth.json" || exit 72
test -z "\${UNRELATED_SECRET:-}" || exit 72
test ! -e answer.txt || exit 73
test "$(cat seed.txt)" = original || exit 73
printf 'changed\n' > seed.txt
rm delete.txt
printf 'answer\n' > answer.txt
case "$prompt" in error) exit 74 ;; timeout) sleep 10 ;; esac
printf '{"type":"text","part":{"text":"container candidate"}}\n'
printf '{"type":"step_finish","part":{"reason":"stop"}}\n'
`;

try {
  write('auth.json', '{"secret":"not-in-retained-artifacts"}');
  write('skills/demo/SKILL.md', 'Candidate instructions');
  write('skills/demo/support.txt', 'Supporting content');
  write('skills/demo/evals/baselines/private.json', 'never-copy');
  write('skills/demo/evals/fixtures/opencode', candidate, 0o755);
  write('skills/demo/evals/fixtures/seed.txt', 'original\n');
  write('skills/demo/evals/fixtures/delete.txt', 'present\n');
  function caseFile(prompt) {
    write('skills/demo/evals/cases/demo.yaml', JSON.stringify({
      id: 'demo', prompt, setup: { fixtures: {
        opencode: 'fixtures/opencode', 'seed.txt': 'fixtures/seed.txt', 'delete.txt': 'fixtures/delete.txt',
      } }, checks: [{ kind: 'file_exists', path: 'answer.txt' }],
    }));
  }
  write('bin/docker', String.raw`#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2), dir = process.env.FAKE_DOCKER_STATE;
fs.mkdirSync(dir, {recursive:true});
fs.appendFileSync(path.join(dir, 'calls'), JSON.stringify(args)+'\n');
if (args[0] === 'info' || args[0] === 'image') process.exit(0);
const file = path.join(dir, 'container.json');
if (args[0] === 'create') {
  fs.writeFileSync(file, JSON.stringify(args));
  if (process.env.FAKE_DOCKER_FAIL_CREATE === '1') process.exit(125);
  fs.writeFileSync(args[args.indexOf('--cidfile') + 1], 'fake-container');
  console.log('fake-container'); process.exit(0);
}
if (args[0] === 'start') {
  const create = JSON.parse(fs.readFileSync(file));
  const mounts = create.flatMap((arg, index) => arg === '--mount' ? [create[index+1]] : []);
  const mount = target => mounts.find(value => value.includes('dst='+target)).split(',').find(value => value.startsWith('src=')).slice(4);
  const cwd = mount('/work'), home = path.join(dir, 'home');
  fs.mkdirSync(path.join(home,'.local/share/opencode'), {recursive:true});
  fs.copyFileSync(mount('/auth.json'), path.join(home,'.local/share/opencode/auth.json'));
  const result = spawnSync('/bin/sh', [path.join(cwd,'opencode'),create.at(-1)], {
    cwd, env:{PATH:process.env.PATH,HOME:home,OPENCODE_CONFIG_DIR:mount('/config')}, encoding:'utf8',
  });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  fs.writeFileSync(path.join(dir,'exit'), String(result.status));
  process.exit(result.status);
}
if (args[0] === 'inspect') { console.log(fs.readFileSync(path.join(dir,'exit'),'utf8')); process.exit(0); }
if (args[0] === 'rm' || args[0] === 'kill') process.exit(0);
process.exit(99);
`, 0o755);

  const env = {
    ...process.env,
    PATH: `${work}/bin:${root}/shims:${process.env.PATH}`,
    HOME: `${work}/home`,
    EVAL_STATE_DIR: `${work}/state`,
    OPENCODE_SKILLS_ROOT: `${work}/skills`, OPENCODE_SKILLS_EXTRA_ROOT: '',
    OPENCODE_AUTH_FILE: `${work}/auth.json`,
    EVAL_RUNNER: 'docker', EVAL_DOCKER_IMAGE: 'test-image@sha256:fake',
    EVAL_DOCKER_AUTH_ENV: 'OPENAI_API_KEY', OPENAI_API_KEY: 'test-only-not-a-real-api-key',
    UNRELATED_SECRET: 'must-not-forward',
    EVAL_SKIP_AUTH_CHECK: '1', EVAL_LLM_JUDGE_LIVE: '0', EVAL_AUTOFIX: '0',
    EVAL_REPETITIONS: '1', EVAL_STABILITY_SAMPLES: '1', EVAL_BYPASS: '0', EVAL_MAX_SECONDS: '5',
    FAKE_DOCKER_STATE: `${work}/docker-state`,
  };
  function run(prompt, extra = {}, args = []) {
    caseFile(prompt);
    const output = spawnSync('bash', [path.join(pkg, 'scripts/eval/run.sh'), '--skill=demo', '--debug', ...args], {
      cwd: work, env: { ...env, ...extra }, encoding: 'utf8', timeout: 120000,
    });
    assert.equal(output.signal, null, output.stderr);
    const id = /run_id=([^\s]+)/.exec(output.stdout)?.[1];
    return { output, id, dir: id && path.join(env.EVAL_STATE_DIR, 'runs', id) };
  }
  let result = run('pass', {}, ['--repetitions=2']);
  assert.equal(result.output.status, 0, result.output.stderr);
  const calls = () => fs.readFileSync(`${work}/docker-state/calls`, 'utf8').trim().split('\n').map(JSON.parse);
  const create = calls().find(args => args[0] === 'create');
  for (const flag of ['--read-only', '--cap-drop', '--security-opt', '--cpus', '--memory', '--memory-swap', '--pids-limit', '--tmpfs', '--user']) {
    assert.ok(create.includes(flag), flag);
  }
  assert.ok(create.includes('--pull=never'));
  assert.ok(create.includes('OPENAI_API_KEY'));
  assert.ok(!create.includes(env.OPENAI_API_KEY));
  assert.ok(!create.includes('UNRELATED_SECRET'));
  const mounts = create.flatMap((arg, index) => arg === '--mount' ? [create[index + 1]] : []);
  assert.equal(mounts.length, 3);
  for (const mount of mounts) {
    const source = mount.split(',').find(value => value.startsWith('src=')).slice(4);
    assert.match(source, /eval-candidate\./);
    assert.ok(!fs.existsSync(source), 'temporary candidate data must be removed');
  }
  assert.ok(calls().some(args => args[0] === 'rm' && args[1] === '-f'));
  assert.ok(!fs.existsSync(path.join(result.dir, 'demo/workdir/delete.txt')));
  assert.ok(!fs.existsSync(path.join(result.dir, 'demo/sandbox/home/.local/share/opencode/auth.json')));
  assert.equal(fs.readFileSync(path.join(result.dir, 'demo/workdir/seed.txt'), 'utf8'), 'changed\n');
  result = run('error');
  assert.equal(result.output.status, 13, result.output.stderr);
  assert.equal(fs.readFileSync(path.join(result.dir, 'demo/exit-code'), 'utf8'), '74\n');
  result = run('timeout', { EVAL_MAX_SECONDS: '1' });
  assert.equal(result.output.status, 13, result.output.stderr);
  assert.equal(fs.readFileSync(path.join(result.dir, 'demo/exit-code'), 'utf8'), '124\n');
  assert.ok(calls().some(args => args[0] === 'kill'));
  const removalsBefore = calls().filter(args => args[0] === 'rm').length;
  result = run('pass', { FAKE_DOCKER_FAIL_CREATE: '1' });
  assert.equal(result.output.status, 13);
  assert.equal(calls().filter(args => args[0] === 'rm').length, removalsBefore, 'failed create must not remove an unowned container');
  assert.equal(run('pass', { EVAL_DOCKER_AUTH_ENV: 'UNRELATED_SECRET' }).output.status, 13);
  assert.equal(run('pass', { EVAL_RUNNER: 'invalid' }).output.status, 13);
  assert.equal(run('pass', { EVAL_DOCKER_IMAGE: '' }).output.status, 13);
  assert.equal(run('pass', { EVAL_DOCKER_CPUS: '0' }).output.status, 13);
  assert.equal(run('pass', { EVAL_DOCKER_MEMORY: '0' }).output.status, 13);
  assert.equal(run('pass', { EVAL_MAX_SECONDS: '0' }).output.status, 13);
  console.log('PASS: fake Docker lifecycle, limits, isolated mounts, auth forwarding, failures, and timeout cleanup');

  if (process.env.EVAL_TEST_DOCKER_IMAGE) {
    const liveEnv = {
      PATH: `${root}/shims:${process.env.PATH}`,
      EVAL_DOCKER_IMAGE: process.env.EVAL_TEST_DOCKER_IMAGE,
      EVAL_DOCKER_AUTH_ENV: '',
    };
    result = run('pass', liveEnv, ['--repetitions=2']);
    assert.equal(result.output.status, 0, `${result.output.stdout}\n${result.output.stderr}`);
    assert.match(fs.readFileSync(path.join(result.dir, 'demo/transcript.jsonl'), 'utf8'), /container candidate/);
    result = run('error', liveEnv);
    assert.equal(result.output.status, 13, result.output.stderr);
    assert.equal(fs.readFileSync(path.join(result.dir, 'demo/exit-code'), 'utf8'), '74\n');
    result = run('timeout', { ...liveEnv, EVAL_MAX_SECONDS: '1' });
    assert.equal(result.output.status, 13, result.output.stderr);
    assert.equal(fs.readFileSync(path.join(result.dir, 'demo/exit-code'), 'utf8'), '124\n');
    console.log('PASS: real Docker with local image and fake candidate (success, failure, timeout, fresh repetitions)');
  } else {
    console.log('SKIP: real Docker; set EVAL_TEST_DOCKER_IMAGE to a local image with /bin/sh');
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
