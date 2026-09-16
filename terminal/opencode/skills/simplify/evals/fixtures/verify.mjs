import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { firstPositive } from './sloppy.mjs';

const cases = [
  [[], undefined],
  [[-2, -0, 0], undefined],
  [[-2, 3, 4], 3],
  [[4, 3, -2], 4],
  [[NaN, -Infinity, 0.125, Infinity], 0.125],
  [[Infinity, 2], Infinity],
  [[Number.MIN_VALUE, 1], Number.MIN_VALUE],
];
for (const [values, expected] of [...cases, ...cases.toReversed()]) {
  const before = values.slice();
  assert.equal(firstPositive(values), expected);
  assert.deepEqual(values, before);
}
writeFileSync('verification.json', JSON.stringify({
  source_sha256: createHash('sha256').update(readFileSync('sloppy.mjs')).digest('hex'),
  cases: cases.length,
  passed: true,
}) + '\n');
console.log('Passed 7 behavior cases and input-preservation checks.');
