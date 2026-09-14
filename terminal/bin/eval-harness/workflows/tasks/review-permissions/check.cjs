const { assert, file, run, preserve, finish } = require('../../check-lib.cjs');
finish(async () => {
  preserve(__dirname, ['CONTRACT.md']);
  file('permissions.cjs');
  const { createReviewer } = require(file('review.cjs'));
  for (const origin of ['global', 'agent', 'session']) {
    for (const denial of ['deny', 'ask']) {
      const config = { global: { secret: 'allow' }, agents: { writer: { secret: 'allow' } } };
      const session = { secret: 'allow' };
      const layers = { global: config.global, agent: config.agents.writer, session };
      layers[origin].secret = denial;
      const reads = [];
      const asks = [];
      const parent = { history: ['first', 'second', 'third'] };
      let release;
      const held = new Promise(resolve => { release = resolve; });
      const launch = createReviewer(config, {
        read: resource => { reads.push(resource); return `content:${resource}`; },
        ask: resource => { asks.push(resource); return true; },
        review: async read => {
          await held;
          assert.throws(() => read('secret'), { code: 'DENIED' });
          return read('public');
        },
      });
      const review = launch(parent, 'writer', session);
      assert(review && typeof review.read === 'function', 'launch must not await review');
      parent.history.push('fourth');
      assert.throws(() => review.read('secret'), { code: 'DENIED' });
      assert.deepEqual(reads, [], 'content disclosed before refusal');
      assert.deepEqual(asks, [], 'automatic review requested approval');
      release();
      assert.equal(await review.done, 'content:public');
      assert.deepEqual(reads, ['public']);
      assert.deepEqual(asks, []);
      assert.deepEqual(parent.history, ['first', 'second', 'third', 'fourth']);
    }
  }
  const config = { global: {}, agents: { writer: {} } };
  const accessed = [];
  const launch = createReviewer(config, {
    read: resource => { accessed.push(resource); return resource; },
    ask: () => assert.fail('approval requested'), review: async () => 'review',
  });
  config.agents.writer = { '*': 'deny', public: 'allow' };
  const review = launch({ history: [] }, 'writer', {});
  assert.throws(() => review.read('late-secret'), { code: 'DENIED' });
  assert.equal(review.read('public'), 'public');
  config.agents.writer = { public: 'ask' };
  assert.throws(() => review.read('public'), { code: 'DENIED' });
  assert.deepEqual(accessed, ['public']);
  await review.done;
  assert.equal(run('node', [file('test.cjs')]).status, 0);
});
