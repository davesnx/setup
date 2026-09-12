exports.choose = (framework, user) => framework || user;
exports.restore = (scripts, run) => scripts.slice().sort().forEach(run);
exports.link = (existing, io) => { if (existing) io.remove(); io.link(); };
