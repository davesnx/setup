const { assert, fs, path, file, json, text, run, preserve, finish } = require('../../check-lib.cjs');
finish(() => {
  const untouched = ['CONTRACT.md', 'history/session.json', 'old-setup/tool.txt',
    'new-setup/tool.txt', 'new-setup/repo/tool.txt', 'other-project/notes.txt', 'home/user.txt'];
  const check = destination => {
    preserve(__dirname, untouched);
    assert.deepEqual(json('active.json'), {
      dotfiles: destination, editor: [destination, 'other-project'],
      service: { server: destination, sessions: [destination, 'other-project'] },
      monorepo: 'other-project', history: 'history/session.json',
    });
    assert.deepEqual(json('startup.json'), { setupRoot: destination, editor: 'fixture-editor' });
    assert.equal(fs.realpathSync('home/tool'), path.resolve(destination, 'tool.txt'));
    assert.equal(fs.readlinkSync('home/personal'), '../other-project/notes.txt');
  };
  file('migrate.cjs');
  check('new-setup');
  const before = text('active.json');
  for (const invalid of ['missing', '../outside', '/tmp']) {
    assert.notEqual(run('node', ['migrate.cjs', invalid]).status, 0);
    assert.equal(text('active.json'), before, 'invalid destination changed state');
    check('new-setup');
  }
  for (const destination of ['new-setup/repo', 'new-setup', 'new-setup']) {
    assert.equal(run('node', ['migrate.cjs', destination]).status, 0);
    check(destination);
  }
  assert.equal(run('node', [file('test.cjs')]).status, 0);
  check('new-setup');
});
