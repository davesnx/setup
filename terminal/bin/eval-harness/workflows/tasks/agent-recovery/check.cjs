const net = require('node:net');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { assert, fs, path, file, run, preserve, finish } = require('../../check-lib.cjs');
const exec = promisify(execFile);
finish(async () => {
  preserve(__dirname, ['probe.cjs', 'CONTRACT.md']);
  file('select.cjs');
  const startup = file('startup.sh');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-check-'));
  const servers = [];
  const sockets = new Set();
  async function agent(name, response) {
    const location = path.join(temp, name);
    const control = { response };
    const server = net.createServer(socket => {
      sockets.add(socket);
      socket.on('error', () => {});
      socket.on('close', () => sockets.delete(socket));
      if (control.response !== null) socket.end(control.response);
    });
    servers.push(server);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(location, resolve); });
    return { location, control };
  }
  try {
    const state = path.join(temp, 'state');
    const stable = path.join(state, 'agent.sock');
    const a = await agent('a.sock', '1');
    const b = await agent('b.sock', '0');
    const call = async (incoming, mode = 'ssh') => {
      const result = await exec('sh', [startup, state, incoming, mode], { timeout: 4000 });
      return result.stdout.trim();
    };
    assert.equal(await call(a.location, 'local'), a.location);
    assert.equal(fs.existsSync(state), false);
    const alias = path.join(temp, 'incoming');
    fs.symlinkSync(a.location, alias);
    assert.equal(await call(alias), stable);
    assert.equal(fs.readlinkSync(stable), a.location, 'target must be resolved');
    assert.equal(await call(b.location), stable);
    assert.equal(fs.readlinkSync(stable), a.location, 'empty responsive agent lost');
    assert.equal(await call(stable), stable);
    assert.equal(fs.realpathSync(stable), a.location, 'self-link');
    a.control.response = null;
    assert.equal(await call(b.location), stable);
    assert.equal(fs.realpathSync(stable), b.location, 'stalled agent not replaced');
    assert.equal(await call(alias), stable);
    assert.equal(fs.realpathSync(stable), b.location);
    b.control.response = null;
    const loop = path.join(temp, 'loop');
    fs.symlinkSync(loop, loop);
    assert.equal(await call(loop), loop);
    assert.equal(fs.readlinkSync(stable), b.location, 'failed recovery changed state');
    a.control.response = '0';
    fs.symlinkSync(stable, path.join(state, 'agent.next'));
    assert.equal(await call(alias), stable);
    assert.equal(fs.realpathSync(stable), a.location, 'partial update not recovered');
    assert.equal(await call(alias), stable);
    assert.equal(fs.existsSync(path.join(state, 'agent.next')), false);
    assert.equal(run('node', [file('test.cjs')]).status, 0);
    preserve(__dirname, ['probe.cjs', 'CONTRACT.md']);
  } finally {
    for (const socket of sockets) socket.destroy();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
