const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const source = process.argv[2] || path.join(root, 'node_modules/@nano-step/eval-harness')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-gaps-'))
const skill = path.join(work, 'skills/gaps')
const cases = path.join(skill, 'evals/cases')
const baselines = path.join(skill, 'evals/baselines')
const state = path.join(work, 'state')
const env = {
  ...process.env, PATH: `${work}/bin:${root}/shims:${process.env.PATH}`,
  OPENCODE_SKILLS_ROOT: path.dirname(skill), OPENCODE_SKILLS_EXTRA_ROOT: '',
  EVAL_STATE_DIR: state, EVAL_SKIP_AUTH_CHECK: '1', EVAL_AUTOFIX: '0',
  EVAL_MAX_SECONDS: '5', EVAL_CHECK_TIMEOUT_SECONDS: '2',
  EVAL_WARN_ONLY: '0', EVAL_BYPASS: '0', EVAL_STABILITY_SAMPLES: '1',
  EVAL_MODE: 'smoke', EVAL_FAIL_ON_STALE_PRICING: '0',
  EVAL_RUNNER: 'host', EVAL_REPETITIONS: '1', EVAL_LLM_JUDGE_LIVE: '0',
}
function cli(command, args = [], extra = {}, expected = 0) {
  const result = spawnSync('bash', [path.join(source, `scripts/eval/${command}.sh`), ...args], {
    env: { ...env, ...extra }, encoding: 'utf8', timeout: 60000,
  })
  assert.equal(result.status, expected, `${command} ${args}\n${result.error || ''}\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}
function writeCase(id, checks) {
  fs.writeFileSync(path.join(cases, `${id}.yaml`), JSON.stringify({
    id, schema_version: 2, skills_loaded: ['gaps'], prompt: 'local test', checks,
  }))
}
function resultFor(output) {
  const id = output.match(/^\[eval-harness\] run_id=(.+)$/m)[1]
  return JSON.parse(fs.readFileSync(path.join(state, 'runs', id, 'results.json')))
}
const shell = (cmd) => ({ kind: 'shell', cmd, unsafe_shell: true, expect_exact: 'expected' })
const run = (id, extra = {}, expected = 0, args = []) =>
  cli('run', ['--skill=gaps', `--case=${id}`, ...args], extra, expected)

try {
  fs.mkdirSync(cases, { recursive: true })
  fs.mkdirSync(path.join(work, 'bin'))
  fs.writeFileSync(path.join(skill, 'SKILL.md'), '# Test skill\n')
  fs.writeFileSync(path.join(work, 'bin/opencode'), `#!/usr/bin/env bash
if [[ "\${1:-}" == --version ]]; then printf 'test-opencode\\n'; exit 0; fi
printf '%s\\n' '{"type":"text","part":{"text":"expected"}}' '{"type":"step_finish","part":{"reason":"stop"}}'
if [[ -n "\${GAPS_ARTIFACT:-}" ]]; then cp "$GAPS_ARTIFACT" prototype.html; fi
if [[ "\${GAPS_LATER_ERROR:-0}" == 1 && "$PWD" == */repetitions/sample-2/* ]]; then exit 7; fi
if [[ "\${GAPS_DISTRACTION:-0}" == 1 ]]; then
  mkdir -p "$EVAL_STATE_DIR/runs/unrelated"
  printf '%s' '{"run_id":"unrelated","cases":[]}' > "$EVAL_STATE_DIR/runs/unrelated/results.json"
fi
exit "\${GAPS_RUNNER_EXIT:-0}"
`, { mode: 0o755 })
  writeCase('passing', [shell('printf expected')])
  writeCase('failing', [shell('printf expected; exit 1'), shell('printf expected')])
  writeCase('timeout', [shell('printf expected; sleep 10'), shell('printf expected')])
  writeCase('cleared', [shell('test "$EVAL_MODE" = full && printf expected')])

  const failed = resultFor(run('failing', {}, 12))
  assert.equal(failed.verdict, 'FAIL')
  assert.deepEqual(failed.cases[0].checks.map(c => c.passed), [false, true])
  assert.equal(failed.cases[0].checks[0].exit_code, 1)
  assert.equal(failed.cases[0].checks[0].error, false)
  run('passing')
  run('failing', { EVAL_WARN_ONLY: '1' })
  fs.writeFileSync(path.join(state, 'promoted'), '')
  run('failing', {}, 12)
  run('failing', { EVAL_WARN_ONLY: '1' })
  run('passing', { GAPS_RUNNER_EXIT: '7', EVAL_WARN_ONLY: '1' }, 13)
  const timeout = resultFor(run('timeout', {}, 13))
  assert.deepEqual(timeout.cases[0].checks.map(c => c.error), [true, false])
  assert.match(timeout.cases[0].checks[0].diff_hint, /timed out/)
  assert.equal(timeout.cases[0].checks[1].passed, true)
  for (const value of ['0', '-1', 'abc', '1.5', '']) {
    const invalid = resultFor(run('passing', { EVAL_CHECK_TIMEOUT_SECONDS: value }, 13))
    assert.equal(invalid.cases[0].checks[0].failed_check_id, 'shell_timeout_config')
  }
  cli('baseline', ['--skill=gaps', '--case=passing'], { GAPS_DISTRACTION: '1' })
  const baselinePath = path.join(baselines, 'passing.baseline.json')
  const baseline = fs.readFileSync(baselinePath, 'utf8')
  assert.equal(JSON.parse(baseline).passed, true)
  writeCase('passing', [shell('printf expected; exit 1')])
  assert.equal(resultFor(run('passing', {}, 12)).verdict, 'REGRESSION')
  run('passing', { EVAL_WARN_ONLY: '1' })
  cli('baseline', ['--skill=gaps', '--case=passing'])
  assert.equal(fs.readFileSync(baselinePath, 'utf8'), baseline, 'baseline overwritten without --force')
  cli('baseline', ['--skill=gaps', '--case=passing', '--force'])
  assert.equal(JSON.parse(fs.readFileSync(baselinePath)).passed, false)
  cli('baseline', ['--skill=gaps', '--case=failing'])
  assert.equal(JSON.parse(fs.readFileSync(path.join(baselines, 'failing.baseline.json'))).passed, false)
  const beforeError = fs.readFileSync(baselinePath, 'utf8')
  cli('baseline', ['--skill=gaps', '--case=passing', '--force'], { GAPS_RUNNER_EXIT: '7' }, 13)
  assert.equal(fs.readFileSync(baselinePath, 'utf8'), beforeError)
  cli('accept', ['--skill=gaps', '--case=passing'], {}, 13)
  cli('baseline', ['--skill=gaps', '--case=passing', '--force'], { EVAL_BYPASS: '1' }, 13)
  assert.equal(fs.readFileSync(baselinePath, 'utf8'), beforeError, 'bypass accepted stale results')
  writeCase('passing', [shell('printf expected')])
  run('passing')
  cli('accept', ['--skill=gaps', '--case=passing'])
  assert.equal(JSON.parse(fs.readFileSync(baselinePath)).passed, true)
  const beforeRepetitionError = fs.readFileSync(baselinePath, 'utf8')
  const repeatedError = resultFor(run('passing', { GAPS_LATER_ERROR: '1' }, 13, ['--repetitions=3']))
  assert.equal(repeatedError.cases[0].checks[0].passed, true, 'Primary attempt must pass')
  assert.equal(repeatedError.cases[0].repetitions.harness_error, true)
  cli('accept', ['--skill=gaps', '--case=passing'], {}, 13)
  cli('accept', ['--skill=gaps', '--case=passing', '--bless-env', '--yes'], {}, 13)
  cli('baseline', ['--skill=gaps', '--case=passing', '--force'], {
    EVAL_REPETITIONS: '3', GAPS_LATER_ERROR: '1', EVAL_WARN_ONLY: '1',
  }, 13)
  assert.equal(fs.readFileSync(baselinePath, 'utf8'), beforeRepetitionError)
  run('passing')
  cli('accept', ['--skill=gaps', '--case=passing'])
  run('failing', {}, 12, ['--mode=2tier'])
  run('failing', { EVAL_WARN_ONLY: '1' }, 0, ['--mode=2tier'])
  run('cleared', {}, 0, ['--mode=2tier'])
  run('failing', { GAPS_RUNNER_EXIT: '7', EVAL_WARN_ONLY: '1' }, 13, ['--mode=2tier'])
  const mixed = resultFor(cli('run', ['--skill=gaps'], { EVAL_CHECK_TIMEOUT_SECONDS: '1' }, 13))
  assert.ok(mixed.summary.pass > 0)
  fs.unlinkSync(path.join(cases, 'timeout.yaml'))
  const mixedFail = resultFor(cli('run', ['--skill=gaps'], {}, 12))
  assert.ok(mixedFail.summary.pass > 0 && mixedFail.summary.fail > 0)
  assert.match(cli('status'), /mode: BLOCKING/)
  assert.match(cli('status', [], { EVAL_WARN_ONLY: '1' }), /mode: WARN-ONLY/)
  assert.match(cli('promote'), /already block by default/)
  const prototype = path.resolve(root, '../../../agents/skills/logic-prototype')
  fs.cpSync(prototype, path.join(work, 'skills/logic-prototype'), { recursive: true })
  const artifact = path.join(prototype, 'evals/fixtures/cancellation-working.html')
  const prototypeArgs = ['--skill=logic-prototype', '--case=logic-prototype-is-drivable']
  const browserEnv = { GAPS_ARTIFACT: artifact, EVAL_CHECK_TIMEOUT_SECONDS: '25' }
  cli('run', prototypeArgs, browserEnv)
  const broken = path.join(work, 'broken.html')
  fs.writeFileSync(broken, fs.readFileSync(artifact, 'utf8').replace('transition(button.textContent)', 'void 0'))
  cli('run', prototypeArgs, { ...browserEnv, GAPS_ARTIFACT: broken }, 12)
  cli('run', prototypeArgs, { ...browserEnv, EVAL_CHROMIUM_BIN: path.join(work, 'absent-browser') }, 13)
  console.log('PASS: gaps CLI failures, warnings, shell exits/timeouts, baseline/accept, two-tier, status/promote')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
