const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const [state, incoming, mode] = process.argv.slice(2);
const stable = path.join(state, 'agent.sock');
function responsive(socket) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'probe.cjs'), socket], { timeout: 1000 });
  return result.status === 0 || result.status === 1;
}
if (mode !== 'ssh') {
  console.log(incoming);
} else if (responsive(stable)) {
  console.log(stable);
} else {
  let resolved;
  try { resolved = fs.realpathSync(incoming); } catch { resolved = null; }
  if (resolved && responsive(resolved)) {
    fs.mkdirSync(state, { recursive: true });
    const next = path.join(state, 'agent.next');
    fs.rmSync(next, { force: true });
    fs.symlinkSync(resolved, next);
    fs.renameSync(next, stable);
    console.log(stable);
  } else {
    console.log(incoming);
  }
}
