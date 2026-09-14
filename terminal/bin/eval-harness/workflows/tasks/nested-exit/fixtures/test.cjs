const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const result = spawnSync('sh', ['patch.sh', 'command.sh'], {
  env: { ...process.env, PATCH_STATUS: '23' }, encoding: 'utf8',
});
assert.equal(result.status, 23);
