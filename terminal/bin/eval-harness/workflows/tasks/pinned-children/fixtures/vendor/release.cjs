exports.version = '0.11';
exports.convert = ({ props, nested }) => [{ label: 'children', value: nested }, ...props];
