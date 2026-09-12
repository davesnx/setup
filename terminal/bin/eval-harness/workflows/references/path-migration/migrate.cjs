const fs = require('node:fs');
const path = require('node:path');
const destination = process.argv[2];
if (!destination || path.isAbsolute(destination) || destination.split(/[\\/]/).includes('..')) {
  throw new Error('destination must stay in the fixture');
}
const target = fs.realpathSync(path.join(destination, 'tool.txt'));
if (!target.startsWith(fs.realpathSync('.') + path.sep)) throw new Error('destination escapes fixture');
const config = JSON.parse(fs.readFileSync('active.json', 'utf8'));
const previous = config.dotfiles;
const update = value => value === previous ? destination : value;
config.dotfiles = destination;
config.editor = config.editor.map(update);
config.service.server = update(config.service.server);
config.service.sessions = config.service.sessions.map(update);
const startup = JSON.parse(fs.readFileSync('startup.json', 'utf8'));
startup.setupRoot = destination;
fs.writeFileSync('active.json', JSON.stringify(config, null, 2) + '\n');
fs.writeFileSync('startup.json', JSON.stringify(startup, null, 2) + '\n');
const next = 'home/tool.next';
fs.rmSync(next, { force: true });
fs.symlinkSync(path.relative(path.resolve('home'), target), next);
fs.renameSync(next, 'home/tool');
