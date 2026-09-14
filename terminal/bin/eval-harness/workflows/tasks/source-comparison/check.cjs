const { assert, json, text, run, preserve, finish } = require('../../check-lib.cjs');
finish(() => {
  preserve(__dirname, ['upstream/README.md', 'upstream/install.cjs', 'local/install.cjs', 'inspect.cjs', 'FORMAT.md']);
  const facts = json('facts.json');
  const expected = {
    script_precedence: ['framework', 'upstream/install.cjs', 'exports.choose'],
    restoration: ['every-install', 'upstream/install.cjs', 'exports.restore'],
    upstream_existing_file: ['overwrite', 'upstream/install.cjs', 'exports.link'],
    local_existing_file: ['backup', 'local/install.cjs', 'exports.link'],
  };
  assert.equal(facts.length, 4);
  assert.equal(new Set(facts.map(row => row.topic)).size, 4);
  for (const row of facts) {
    assert(expected[row.topic], 'unknown topic');
    const [value, source, symbol] = expected[row.topic];
    assert.equal(row.value, value);
    assert.equal(row.source, source);
    assert(text(source).split('\n').includes(row.quote), 'fabricated quote');
    assert(row.quote.startsWith(symbol), 'unrelated evidence');
  }
  const result = run('node', ['inspect.cjs']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'selected: bundled\n["a","b","a","b","remove","link","backup","link"]\n');
  assert(text('comparison.md').trim().length > 0, 'missing manual-review artifact');
});
