const { assert, fs, run, preserve, finish, file } = require('../../check-lib.cjs');
finish(() => {
  preserve(__dirname, ['command.sh', 'notes.txt']);
  for (const entry of ['patch.sh', 'install.sh', 'test.cjs']) file(entry);
  for (const status of [23, 0, 41, 0]) {
    fs.rmSync('installed.txt', { force: true });
    for (const entry of ['patch.sh', 'install.sh']) {
      const result = run('sh', [entry, 'command.sh'], {
        env: { ...process.env, PATCH_STATUS: String(status) },
      });
      assert.equal(result.status, status, `${entry}: output is not exit status`);
    }
    assert.equal(fs.existsSync('installed.txt'), status === 0);
  }
  assert.equal(run('node', ['test.cjs']).status, 0, 'candidate regression');
  preserve(__dirname, ['command.sh', 'notes.txt']);
});
