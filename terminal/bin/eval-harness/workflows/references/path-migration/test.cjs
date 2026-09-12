const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = JSON.parse(fs.readFileSync('active.json', 'utf8'));
const historical = fs.readFileSync('history/session.json', 'utf8');
const user = fs.readFileSync('home/user.txt', 'utf8');
for (let repeat = 0; repeat < 2; repeat++) {
  assert.equal(spawnSync('node', ['migrate.cjs', config.dotfiles]).status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync('active.json', 'utf8')), config);
  assert.equal(config.service.server, config.dotfiles);
  assert.deepEqual(JSON.parse(fs.readFileSync('startup.json', 'utf8')), {
    setupRoot: config.dotfiles, editor: 'fixture-editor',
  });
  assert.equal(fs.realpathSync('home/tool'), path.resolve(config.dotfiles, 'tool.txt'));
  assert.equal(fs.readFileSync('history/session.json', 'utf8'), historical);
  assert.equal(fs.readFileSync('home/user.txt', 'utf8'), user);
}
