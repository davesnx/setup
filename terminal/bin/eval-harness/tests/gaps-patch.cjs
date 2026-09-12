const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const source = process.argv[2] || path.join(root, 'node_modules/@nano-step/eval-harness')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-gaps-patch-'))
const target = path.join(work, 'package')
function patch(name, reverse, dry) {
  return spawnSync('patch', ['--batch', '--force', '--fuzz=0', '-p1', ...(reverse ? ['--reverse'] : []),
    ...(dry ? ['--dry-run'] : []), '-i', path.join(root, 'patches', name)], {
    cwd: target, encoding: 'utf8',
  })
}
function succeeds(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
}
try {
  fs.cpSync(source, target, { recursive: true })
  const primary = 'eval-harness-0.4.2.patch'
  const gaps = 'eval-harness-gaps.patch'
  const workflows = 'eval-harness-workflows.patch'
  if (patch(workflows, true, true).status === 0) succeeds(patch(workflows, true, false))
  if (patch(gaps, true, true).status === 0) succeeds(patch(gaps, true, false))
  if (patch(primary, true, true).status === 0) succeeds(patch(primary, true, false))
  succeeds(patch(primary, false, true))
  succeeds(patch(primary, false, false))
  succeeds(patch(gaps, false, true))
  succeeds(patch(gaps, false, false))
  succeeds(patch(gaps, true, true))
  assert.notEqual(patch(gaps, false, true).status, 0, 'A repeated patch must be detected')
  for (const file of ['run.sh', 'baseline.sh', 'accept.sh', 'twotier.sh', 'status.sh', 'promote.sh', 'lib/score.sh',
    'hooks/pre-push', 'tests/regression_inject.sh', 'tests/transcript_contract.sh', 'tests/twotier_aggregation.sh',
    'tests/llm_judge_unit.sh', 'tests/pricing.sh']) {
    succeeds(spawnSync('bash', ['-n', path.join(target, 'scripts/eval', file)], { encoding: 'utf8' }))
  }
  console.log('PASS: primary then gaps patch, reverse detection, and shell syntax')
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
