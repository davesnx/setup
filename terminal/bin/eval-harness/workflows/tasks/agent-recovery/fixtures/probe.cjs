const net = require('node:net');
const socket = net.createConnection(process.argv[2]);
let finished = false;
function finish(code) {
  if (finished) return;
  finished = true;
  socket.destroy();
  process.exitCode = code;
}
socket.setTimeout(120, () => finish(2));
socket.on('error', () => finish(2));
socket.on('end', () => finish(2));
socket.on('data', data => finish(data.toString() === '0' ? 0 : data.toString() === '1' ? 1 : 2));
