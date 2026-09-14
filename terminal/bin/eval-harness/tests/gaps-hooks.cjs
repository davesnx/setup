const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const source = process.argv[2] || path.join(root, 'node_modules/@nano-step/eval-harness')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-hooks-'))
try {
  fs.writeFileSync(path.join(work, 'git'), '#!/bin/sh\nprintf "%s\\n" "$GAPS_CHANGED"\n', { mode: 0o755 })
  fs.writeFileSync(path.join(work, 'evaluate'), `#!/bin/sh
printf '%s %s\n' "$1" "$2" >> "$GAPS_CALLS"
test "$1" = run || exit 98
shift
case "$1" in
  --skill=fail*) test "\${EVAL_WARN_ONLY:-0}" = 1 && exit 0; exit 12 ;;
  --skill=error*) exit 13 ;;
  --skill=timeout*) exit 124 ;;
esac
exit 0
`, { mode: 0o755 })
  function check(skills, expected, warning = '0') {
    const calls = path.join(work, 'calls')
    fs.writeFileSync(calls, '')
    const result = spawnSync('bash', [path.join(source, 'scripts/eval/hooks/pre-push')], {
      encoding: 'utf8', input: 'refs/heads/test local refs/heads/test remote\n',
      env: { ...process.env, PATH: `${work}:${process.env.PATH}`, EVAL_WARN_ONLY: warning,
        EVAL_HARNESS_BIN: path.join(work, 'evaluate'), GAPS_CALLS: calls,
        GAPS_CHANGED: skills.map(skill => `.opencode/skills/${skill}/SKILL.md`).join('\n') },
      timeout: 10000,
    })
    assert.equal(result.status, expected, `${skills}: ${result.stdout}\n${result.stderr}`)
    assert.deepEqual(fs.readFileSync(calls, 'utf8').trim().split('\n'),
      [...skills].sort().map(skill => `run --skill=${skill}`), 'Every affected skill must receive the run command')
  }
  check(['pass'], 0)
  check(['fail'], 12)
  check(['fail', 'pass'], 12)
  check(['error', 'fail', 'pass'], 13)
  check(['fail', 'timeout'], 13)
  check(['fail'], 0, '1')
  check(['error', 'fail'], 13, '1')

  const packageRoot = path.join(work, 'public wrapper/terminal/bin/eval-harness')
  const installed = path.join(packageRoot, 'node_modules/@nano-step/eval-harness')
  fs.cpSync(source, installed, { recursive: true })
  fs.copyFileSync(path.join(root, 'eval-harness'), path.join(packageRoot, 'eval-harness'))
  fs.cpSync(path.join(root, 'shims'), path.join(packageRoot, 'shims'), { recursive: true })
  fs.symlinkSync(path.join(root, 'node_modules/yaml'), path.join(packageRoot, 'node_modules/yaml'), 'dir')
  const repository = path.join(work, 'repository')
  const skill = path.join(work, 'skills/hook-skill')
  fs.mkdirSync(repository)
  fs.mkdirSync(path.join(work, 'home'))
  fs.mkdirSync(path.join(skill, 'evals/cases'), { recursive: true })
  fs.writeFileSync(path.join(skill, 'SKILL.md'), '# Hook test skill\n')
  fs.writeFileSync(path.join(skill, 'skill.yaml'), 'evals:\n  required: true\n')
  fs.writeFileSync(path.join(skill, 'evals/cases/one.yaml'), JSON.stringify({
    id: 'one', prompt: 'local hook test', skills_loaded: ['hook-skill'],
    checks: [{ kind: 'file_exists', path: 'answer.txt' }],
  }))
  fs.writeFileSync(path.join(work, 'opencode'), `#!/bin/sh
if [ "$1" = --version ]; then printf 'hook-test-opencode\n'; exit 0; fi
printf 'candidate\n' >> "$GAPS_CALLS"
if [ "$GAPS_RESULT" = pass ]; then printf 'answer\n' > answer.txt; fi
printf '%s\n' '{"type":"step_finish","part":{"reason":"stop"}}'
if [ "$GAPS_RESULT" = error ]; then exit 7; fi
`, { mode: 0o755 })
  const env = {
    ...process.env, PATH: `${work}:${packageRoot}/shims:${process.env.PATH}`,
    HOME: path.join(work, 'home'), OPENCODE_AUTH_FILE: '',
    OPENCODE_SKILLS_ROOT: path.dirname(skill), OPENCODE_SKILLS_EXTRA_ROOT: '',
    EVAL_HARNESS_BIN: path.join(packageRoot, 'eval-harness'),
    EVAL_HARNESS_REGISTRY: path.join(work, 'registry.yaml'),
    EVAL_SKIP_AUTH_CHECK: '1', EVAL_BYPASS: '0', EVAL_RUNNER: 'host',
    EVAL_REPETITIONS: '1', EVAL_STABILITY_SAMPLES: '1', EVAL_MODE: 'smoke',
    EVAL_MAX_SECONDS: '5', EVAL_AUTOFIX: '0', EVAL_LLM_JUDGE_LIVE: '0',
    EVAL_FAIL_ON_STALE_PRICING: '0', GAPS_CHANGED: '.opencode/skills/hook-skill/SKILL.md',
  }
  const registry = spawnSync('bash', [path.join(installed, 'scripts/eval/lib/registry.sh'), 'enable', 'repository'], {
    cwd: repository, env, encoding: 'utf8', timeout: 10000,
  })
  assert.equal(registry.status, 0, registry.stderr)
  let sequence = 0
  function throughWrapper(hook, outcome, expected, warning = '0') {
    const state = path.join(work, `state-${++sequence}`)
    const calls = path.join(work, 'wrapper-calls')
    fs.writeFileSync(calls, '')
    const result = spawnSync('bash', [path.join(installed, 'scripts/eval/hooks', hook),
      ...(hook === 'sync-publish.sh' ? ['hook-skill'] : [])], {
      cwd: repository, encoding: 'utf8', timeout: 30000,
      input: 'refs/heads/test local refs/heads/test remote\n',
      env: { ...env, EVAL_STATE_DIR: state, EVAL_WARN_ONLY: warning,
        GAPS_CALLS: calls, GAPS_RESULT: outcome },
    })
    assert.equal(result.status, expected, `${hook} ${outcome}: ${result.stdout}\n${result.stderr}`)
    assert.equal(fs.readFileSync(calls, 'utf8'), 'candidate\n', 'The public wrapper must execute fake OpenCode once')
    const runId = result.stdout.match(/^\[eval-harness\] run_id=(.+)$/m)?.[1]
    assert.ok(runId, 'Hook must produce a real harness run')
    const report = JSON.parse(fs.readFileSync(path.join(state, 'runs', runId, 'results.json')))
    assert.equal(report.trigger, hook === 'pre-push' ? 'pre-push' : 'sync-publish')
    assert.equal(report.cases[0].passed, outcome === 'pass')
  }
  for (const hook of ['pre-push', 'sync-publish.sh']) {
    throughWrapper(hook, 'pass', 0)
    throughWrapper(hook, 'fail', 12)
    throughWrapper(hook, 'error', 13)
    throughWrapper(hook, 'fail', 0, '1')
    throughWrapper(hook, 'error', 13, '1')
  }
  console.log('PASS: hook run tokens, failure priority, and both hooks through the public wrapper and local registry')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
