const fs = require('node:fs');
const path = require('node:path');
const [state, incoming] = process.argv.slice(2);
const stable = path.join(state, 'agent.sock');
fs.mkdirSync(state, { recursive: true });
fs.rmSync(stable, { force: true });
fs.symlinkSync(incoming, stable);
console.log(stable);
