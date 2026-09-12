const assert = require('node:assert/strict');
const { createReviewer } = require('./review.cjs');
(async () => {
  const config = { global: { secret: 'deny' }, agents: { writer: { secret: 'allow' } } };
  const reads = [];
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const launch = createReviewer(config, {
    read: resource => { reads.push(resource); return resource; },
    ask: () => assert.fail('automatic approval request'),
    review: async read => { await held; return read('public'); },
  });
  config.agents.writer = { late: 'ask' };
  const parent = { history: ['third'] };
  const review = launch(parent, 'writer', {});
  assert.throws(() => review.read('secret'), { code: 'DENIED' });
  assert.throws(() => review.read('late'), { code: 'DENIED' });
  assert.deepEqual(reads, []);
  parent.history.push('fourth');
  release();
  assert.equal(await review.done, 'public');
  assert.deepEqual(parent.history, ['third', 'fourth']);
})().catch(error => { console.error(error); process.exitCode = 1; });
