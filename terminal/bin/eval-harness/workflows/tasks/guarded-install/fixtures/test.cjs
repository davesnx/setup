const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
try {
  const target = path.join(temp, 'tool');
  fs.writeFileSync(target, 'user tool\n');
  const result = spawnSync('sh', ['install.sh', path.resolve('tool.txt'), target]);
  assert.equal(result.status, 73);
  assert.equal(fs.readFileSync(target, 'utf8'), 'user tool\n');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
