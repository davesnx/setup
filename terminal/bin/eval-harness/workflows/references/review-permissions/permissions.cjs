exports.allowed = (layers, resource) => layers.every(layer =>
  (layer?.[resource] ?? layer?.['*'] ?? 'allow') === 'allow');
