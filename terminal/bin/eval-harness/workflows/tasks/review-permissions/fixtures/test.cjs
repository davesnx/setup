const assert = require('node:assert/strict');
const { createReviewer } = require('./review.cjs');
const config = { global: { secret: 'deny' }, agents: { writer: { secret: 'allow' } } };
const launch = createReviewer(config, { read: () => 'private', review: async () => 'result' });
const review = launch({ history: [] }, 'writer', {});
assert.throws(() => review.read('secret'), { code: 'DENIED' });
review.done.catch(error => { throw error; });
