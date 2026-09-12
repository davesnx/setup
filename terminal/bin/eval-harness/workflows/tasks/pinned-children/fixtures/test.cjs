const assert = require('node:assert/strict');
const { convert } = require('./adapter.cjs');
const input = require('./example.json');
assert.equal(convert(input).version, '0.11');
assert.equal(convert(input).args.filter(prop => prop.label === 'children').length, 1);
