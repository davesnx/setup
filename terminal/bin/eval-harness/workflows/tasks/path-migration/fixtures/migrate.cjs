const fs = require('node:fs');
const destination = process.argv[2];
const config = JSON.parse(fs.readFileSync('active.json', 'utf8'));
const startup = JSON.parse(fs.readFileSync('startup.json', 'utf8'));
config.dotfiles = destination;
startup.setupRoot = destination;
fs.writeFileSync('active.json', JSON.stringify(config, null, 2) + '\n');
fs.writeFileSync('startup.json', JSON.stringify(startup, null, 2) + '\n');
