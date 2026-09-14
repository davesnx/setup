const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-local-'));
try {
  const state = path.join(temp, 'state');
  const result = spawnSync('sh', ['startup.sh', state, '/fictional/incoming', 'local'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '/fictional/incoming');
  assert.equal(fs.existsSync(state), false);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
