const os = require('node:os');
const { assert, fs, path, file, text, run, preserve, finish } = require('../../check-lib.cjs');
finish(() => {
  preserve(__dirname, ['CONTRACT.md', 'tool.txt', '.fixture-root']);
  assert.equal(text('notes.txt'), 'working user note\n');
  const git = args => {
    const result = run('git', args);
    assert.equal(result.status, 0);
    return result.stdout;
  };
  assert.equal(git(['show', ':notes.txt']), 'staged user note\n');
  assert.equal(git(['show', 'HEAD:notes.txt']), 'committed note\n');
  assert.equal(git(['diff', '--cached', '--name-only']).trim(), 'notes.txt');
  assert.equal(git(['rev-list', '--count', 'HEAD']).trim(), '1');
  file('prelude.sh');
  const install = file('install.sh');
  const source = file('tool.txt');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-check-'));
  try {
    const target = path.join(temp, 'managed');
    const call = (src = source) => run('sh', [install, src, target]);
    fs.writeFileSync(target, 'foreign\n');
    assert.equal(call().status, 73);
    assert.equal(fs.readFileSync(target, 'utf8'), 'foreign\n');
    fs.unlinkSync(target);
    fs.mkdirSync(target);
    assert.equal(call().status, 73);
    assert.deepEqual(fs.readdirSync(target), []);
    fs.rmdirSync(target);
    fs.symlinkSync(path.join(temp, 'missing'), target);
    assert.notEqual(call(path.join(temp, 'absent-source')).status, 0);
    assert.equal(fs.readlinkSync(target), path.join(temp, 'missing'));
    assert.equal(call().status, 0);
    const before = fs.lstatSync(target, { bigint: true });
    assert.equal(call().status, 0);
    const after = fs.lstatSync(target, { bigint: true });
    assert.equal(after.ino, before.ino, 'correct link replaced');
    assert.equal(after.ctimeNs, before.ctimeNs, 'correct link recreated');
    assert.equal(fs.realpathSync(target), source);
    assert.deepEqual(fs.readdirSync(temp), ['managed'], 'unexpected backup');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  assert.equal(run('node', [file('test.cjs')]).status, 0);
  preserve(__dirname, ['CONTRACT.md', 'tool.txt', '.fixture-root']);
  assert.equal(text('notes.txt'), 'working user note\n');
  assert.equal(git(['show', ':notes.txt']), 'staged user note\n');
  assert.equal(git(['diff', '--cached', '--name-only']).trim(), 'notes.txt');
});
