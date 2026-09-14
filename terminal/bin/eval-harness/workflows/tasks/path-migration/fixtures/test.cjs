const assert = require('node:assert/strict');
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('active.json', 'utf8'));
assert.equal(config.service.server, config.dotfiles);
assert.deepEqual(JSON.parse(fs.readFileSync('startup.json', 'utf8')), {
  setupRoot: config.dotfiles, editor: 'fixture-editor',
});
