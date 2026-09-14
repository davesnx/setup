const os = require('node:os');
const { assert, fs, path, file, json, run, preserve, finish } = require('../../check-lib.cjs');
finish(() => {
  preserve(__dirname, ['CONTRACT.md', 'lock.json', 'vendor/release.cjs', 'vendor/fork.cjs', 'vendor/README.md', 'render.cjs', 'example.json']);
  const { convert } = require(file('adapter.cjs'));
  const cases = [
    { tag: 'A', props: [], nested: ['body'] },
    { tag: 'B', props: [{ label: 'children', value: [] }], nested: ['discard'] },
    { tag: 'C', props: [{ label: 'children', value: null }], nested: ['discard'] },
    { tag: 'D', props: [{ label: 'x', value: 1 }, { label: 'children', value: { expression: 'items' } }, { label: 'x', value: 2 }], nested: [] },
    json('example.json'),
  ];
  for (const input of cases) {
    const original = structuredClone(input);
    const explicit = input.props.find(prop => prop.label === 'children');
    const args = explicit ? input.props : [{ label: 'children', value: input.nested }, ...input.props];
    assert.deepEqual(convert(input), { version: '0.11', args });
    assert.deepEqual(input, original, 'input mutated');
  }
  assert.throws(() => convert({ tag: 'E', nested: [], props: [
    { label: 'children', value: [] }, { label: 'children', value: ['other'] },
  ] }), { code: 'DUPLICATE_CHILDREN' });
  const rendered = run('node', ['render.cjs', 'example.json']);
  assert.equal(rendered.status, 0);
  assert.deepEqual(JSON.parse(rendered.stdout), { version: '0.11', args: json('example.json').props });
  assert.equal(run('node', [file('test.cjs')]).status, 0);
  // A warm require cache masks imports; use a separate tree without the fork.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pinned-check-'));
  try {
    fs.cpSync(process.cwd(), temp, {
      recursive: true,
      filter: source => {
        const relative = path.relative(process.cwd(), source);
        return !['.git', '.opencode', '.skills', 'vendor/fork.cjs'].includes(relative);
      },
    });
    const result = run('node', ['render.cjs', 'example.json'], { cwd: temp });
    assert.equal(result.status, 0, 'adapter requires unpinned fork');
    assert.deepEqual(JSON.parse(result.stdout), { version: '0.11', args: json('example.json').props });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
