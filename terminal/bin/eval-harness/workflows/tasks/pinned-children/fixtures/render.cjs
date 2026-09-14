const fs = require('node:fs');
const { convert } = require('./adapter.cjs');
const result = convert(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
if (result.args.filter(prop => prop.label === 'children').length !== 1) {
  throw Object.assign(new Error('duplicate children'), { code: 'DUPLICATE_CHILDREN' });
}
console.log(JSON.stringify(result));
