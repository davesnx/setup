# Conversion adapter

The dependency snapshots model a JSX label-list conversion in JavaScript.
This is not a real compiler. `adapter.convert(input)` returns `{version, args}`.
Input is `{tag, props, nested}`. Props is an ordered array of `{label, value}`.
Values can be strings, arrays, null, or objects. An explicit children prop
wins over nested children, including when its value is empty or null. If there
is no explicit children prop, generate one from nested. Preserve the order and
values of other props, including repeats. Do not mutate the input. If the input
already has multiple explicit children props, fail with code DUPLICATE_CHILDREN.

Use the module named in lock.json, not the local fork. The adapter must work
when that local fork file is absent. The pin and vendor sources are read-only.
`node render.cjs example.json` exercises the adapter through the render caller.
The CLI prints the version and resulting props as JSON and fails on duplicate
children labels. node test.cjs tests the public module interface.
