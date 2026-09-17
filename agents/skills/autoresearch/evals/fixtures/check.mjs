import assert from 'node:assert/strict';
import { findRequested } from './lookup.mjs';
const a = Object.freeze({ id: 'a', payload: 1 });
const anotherA = Object.freeze({ id: 'a', payload: 2 });
const b = Object.freeze({ id: 'b', payload: 3 });
const odd = Object.freeze({ id: '__proto__', payload: 4 });
const items = Object.freeze([a, anotherA, b, odd]);
const cases = [
  [items, Object.freeze(['a', 'missing', 'b', 'a', '__proto__']), [a, undefined, b, a, odd]],
  [Object.freeze([]), Object.freeze(['a']), [undefined]],
  [items, Object.freeze([]), []],
  [Object.freeze([b, anotherA]), Object.freeze(['a', 'b']), [anotherA, b]],
];
for (const [input, ids, expected] of [...cases, ...cases.toReversed()]) {
  const result = findRequested(input, ids);
  assert.equal(result.length, expected.length);
  expected.forEach((value, index) => assert.equal(result[index], value));
}
console.log('correctness-passed');
