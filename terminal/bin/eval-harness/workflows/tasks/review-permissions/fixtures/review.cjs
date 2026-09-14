const { allowed } = require('./permissions.cjs');
exports.createReviewer = (config, io) => {
  const agents = structuredClone(config.agents);
  return (parent, agentName, sessionRules) => {
    const read = resource => {
      if (!allowed([config.global, agents[agentName], sessionRules], resource)) {
        throw Object.assign(new Error('denied'), { code: 'DENIED' });
      }
      return io.read(resource);
    };
    const done = Promise.resolve().then(() => io.review(read)).then(result => {
      parent.history.push(result);
      return result;
    });
    return { read, done };
  };
};
