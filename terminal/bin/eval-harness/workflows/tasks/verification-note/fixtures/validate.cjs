const assert = require('node:assert/strict');
const guide = require('./guide.json');
assert.equal(guide.name, 'converter-guide');
assert.deepEqual(guide.sections, ['build', 'convert', 'check', 'cleanup']);
console.log('guide metadata valid');
