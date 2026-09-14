const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { convert } = require('./adapter.cjs');
for (const value of [[], null, { expression: 'items' }]) {
  const input = { tag: 'Card', props: [{ label: 'children', value }], nested: ['discard'] };
  const original = structuredClone(input);
  assert.deepEqual(convert(input), { version: '0.11', args: input.props });
  assert.deepEqual(input, original);
}
const plain = { tag: 'Card', props: [], nested: ['body'] };
assert.deepEqual(convert(plain).args, [{ label: 'children', value: ['body'] }]);
assert.throws(() => convert({ ...plain, props: [
  { label: 'children', value: [] }, { label: 'children', value: [] },
] }), { code: 'DUPLICATE_CHILDREN' });
const result = spawnSync('node', ['render.cjs', 'example.json'], { encoding: 'utf8' });
assert.equal(result.status, 0);
assert.deepEqual(JSON.parse(result.stdout), { version: '0.11', args: require('./example.json').props });
