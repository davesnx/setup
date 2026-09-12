const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'));
try {
  const target = path.join(temp, 'tool');
  const source = path.resolve('tool.txt');
  const install = src => spawnSync('sh', ['install.sh', src, target]);
  fs.writeFileSync(target, 'user tool\n');
  assert.equal(install(source).status, 73);
  assert.equal(fs.readFileSync(target, 'utf8'), 'user tool\n');
  fs.unlinkSync(target);
  fs.symlinkSync(path.join(temp, 'missing'), target);
  assert.notEqual(install(path.join(temp, 'absent')).status, 0);
  assert.equal(fs.readlinkSync(target), path.join(temp, 'missing'));
  assert.equal(install(source).status, 0);
  const before = fs.lstatSync(target, { bigint: true }).ctimeNs;
  assert.equal(install(source).status, 0);
  assert.equal(fs.lstatSync(target, { bigint: true }).ctimeNs, before);
  assert.equal(fs.realpathSync(target), source);
  assert.deepEqual(fs.readdirSync(temp), ['tool']);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
