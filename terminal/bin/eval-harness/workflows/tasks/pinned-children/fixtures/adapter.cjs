const backend = require('./vendor/fork.cjs');
exports.convert = input => ({ version: backend.version, args: backend.convert(input) });
