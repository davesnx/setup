export function accept(name) {
  return name.length > 0 && !name.startsWith('_');
}
