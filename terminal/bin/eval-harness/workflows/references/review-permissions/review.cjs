const { allowed } = require('./permissions.cjs');
exports.createReviewer = (config, io) => (parent, agentName, sessionRules) => {
  const read = resource => {
    if (!allowed([config.global, config.agents[agentName], sessionRules], resource)) {
      throw Object.assign(new Error('denied'), { code: 'DENIED' });
    }
    return io.read(resource);
  };
  return { read, done: Promise.resolve().then(() => io.review(read)) };
};
