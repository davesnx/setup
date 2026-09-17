export function findRequested(items, ids) {
  return ids.map(id => items.find(item => item.id === id));
}
