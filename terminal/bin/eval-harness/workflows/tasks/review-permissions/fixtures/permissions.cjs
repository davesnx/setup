exports.allowed = (layers, resource) => {
  const merged = Object.assign({}, ...layers);
  return (merged[resource] ?? merged['*'] ?? 'allow') !== 'deny';
};
