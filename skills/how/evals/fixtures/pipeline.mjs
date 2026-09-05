import { key } from './key.mjs';
import { accept } from './policy.mjs';

export function prepare(names) {
  return names.map(key).filter(accept);
}
