const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function file(name, root = process.cwd()) {
  assert.equal(path.isAbsolute(name), false, 'absolute path');
  assert(!name.split(/[\\/]/).includes('..'), 'parent path');
  const base = fs.realpathSync(root);
  const target = path.resolve(base, name);
  let current = base;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    assert(!fs.lstatSync(current).isSymbolicLink(), `linked input: ${name}`);
  }
  assert(target.startsWith(base + path.sep), 'path outside root');
  assert(fs.statSync(target).isFile(), `not a file: ${name}`);
  return target;
}

function text(name, root) { return fs.readFileSync(file(name, root), 'utf8'); }
function json(name, root) { return JSON.parse(text(name, root)); }
function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(), encoding: 'utf8', timeout: 5000,
    maxBuffer: 1024 * 1024, ...options,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, 'command killed');
  return result;
}

function preserve(task, names) {
  for (const name of names) {
    assert.equal(text(name), text(name, path.join(task, 'fixtures')), `changed input: ${name}`);
  }
}

function finish(check) {
  Promise.resolve().then(check).then(() => console.log('ok')).catch(error => {
    console.error(error.stack);
    process.exitCode = 1;
  });
}

module.exports = { assert, fs, path, file, text, json, run, preserve, finish };
