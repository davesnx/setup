exports.version = 'fork-5262570';
exports.convert = ({ props, nested }) => props.some(prop => prop.label === 'children')
  ? props.slice() : [{ label: 'children', value: nested }, ...props];
