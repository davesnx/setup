const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { promisify } = require('node:util');
const exec = promisify(require('node:child_process').execFile);
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-test-'));
  const state = path.join(temp, 'state');
  const a = path.join(temp, 'a.sock');
  const b = path.join(temp, 'b.sock');
  const first = net.createServer(socket => socket.end('1'));
  const second = net.createServer(socket => socket.end('0'));
  const call = (incoming, mode = 'ssh') => exec('sh', ['startup.sh', state, incoming, mode], { timeout: 4000 });
  try {
    assert.equal((await call(a, 'local')).stdout.trim(), a);
    assert.equal(fs.existsSync(state), false);
    await new Promise(resolve => first.listen(a, resolve));
    await new Promise(resolve => second.listen(b, resolve));
    await call(a);
    await call(b);
    assert.equal(fs.realpathSync(path.join(state, 'agent.sock')), a);
    await call(path.join(state, 'agent.sock'));
    assert.equal(fs.realpathSync(path.join(state, 'agent.sock')), a);
    await new Promise(resolve => first.close(resolve));
    await call(b);
    await call(b);
    assert.equal(fs.realpathSync(path.join(state, 'agent.sock')), b);
  } finally {
    if (first.listening) await new Promise(resolve => first.close(resolve));
    if (second.listening) await new Promise(resolve => second.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
