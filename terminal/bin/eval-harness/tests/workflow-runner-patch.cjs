const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const patches = ['eval-harness-0.4.2.patch', 'eval-harness-gaps.patch', 'eval-harness-workflows.patch'];
function apply(target, name, reverse = false, dry = false) {
  return spawnSync('patch', ['--batch', '--force', '--fuzz=0', '-p1',
    ...(reverse ? ['--reverse'] : []), ...(dry ? ['--dry-run'] : []),
    '-i', path.join(root, 'patches', name)], { cwd: target, encoding: 'utf8' });
}
function succeeds(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}
function prepare(target, workflows = true) {
  const source = process.env.EVAL_TEST_PACKAGE || path.join(root, 'node_modules/@nano-step/eval-harness');
  fs.cpSync(source, target, { recursive: true });
  for (const name of [...patches].reverse()) {
    if (fs.existsSync(path.join(root, 'patches', name)) && apply(target, name, true, true).status === 0) {
      succeeds(apply(target, name, true));
    }
  }
  for (const name of patches.slice(0, workflows ? 3 : 2)) succeeds(apply(target, name));
}
module.exports = { prepare, succeeds };

if (require.main === module) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-patch-'));
  try {
    prepare(work);
    succeeds(apply(work, patches[2], true, true));
    assert.notEqual(apply(work, patches[2], false, true).status, 0);
    for (const name of ['workflow.sh', 'run.sh', 'regrade.sh', 'status.sh', 'lib/spawn.sh', 'lib/diff.sh']) {
      succeeds(spawnSync('bash', ['-n', path.join(work, 'scripts/eval', name)], { encoding: 'utf8' }));
    }
    console.log('PASS: primary, gaps, workflow patch order and shell syntax');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
