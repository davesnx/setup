import { findRequested } from './lookup.mjs';
let reads = 0;
const items = Array.from({ length: 2000 }, (_, n) => ({ get id() { reads++; return `id-${n}`; } }));
const ids = Array.from({ length: 500 }, (_, n) => n % 2 ? `id-${1500 + n}` : `missing-${n}`);
const result = findRequested(items, ids);
if (result.length !== ids.length) throw new Error('wrong result length');
console.log(JSON.stringify({ idReads: reads, items: items.length, queries: ids.length }));
