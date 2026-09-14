const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
for (const status of [23, 0, 7]) {
  fs.rmSync('installed.txt', { force: true });
  for (const entry of ['patch.sh', 'install.sh']) {
    const result = spawnSync('sh', [entry, 'command.sh'], {
      env: { ...process.env, PATCH_STATUS: String(status) }, encoding: 'utf8',
    });
    assert.equal(result.status, status);
  }
  assert.equal(fs.existsSync('installed.txt'), status === 0);
}
