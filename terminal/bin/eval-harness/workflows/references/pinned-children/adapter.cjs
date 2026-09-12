const lock = require('./lock.json');
const backend = require(lock.module);
exports.convert = input => {
  const explicit = input.props.filter(prop => prop.label === 'children');
  if (explicit.length > 1) {
    throw Object.assign(new Error('duplicate children'), { code: 'DUPLICATE_CHILDREN' });
  }
  if (explicit.length === 0) {
    return { version: backend.version, args: backend.convert(input) };
  }
  const converted = backend.convert({ ...input, props: [], nested: explicit[0].value });
  const children = converted.find(prop => prop.label === 'children');
  return {
    version: backend.version,
    args: input.props.map(prop => prop.label === 'children' ? children : prop),
  };
};
