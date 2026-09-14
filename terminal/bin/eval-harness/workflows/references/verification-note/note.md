# Converter guide

Adds guide metadata for building, converting, checking, and cleaning up output.
The converter implementation stays in its separate source project. It was not
moved here. The two examples were copied from the cleanup guide and have not
been executed in this checkout.

`node validate.cjs` passed with `guide metadata valid`. This checks metadata,
not conversion behavior. `node runtime.cjs` exited 69 because the fixture
compiler is not supplied. Runtime verification is blocked, not passed. Run the
converter checks and examples in a checkout with that compiler before claiming
the conversion works. No compiler was installed for this note.
