# Source notes

This change adds guide metadata, not a converter implementation. The converter
remains in a separate source project which is not included here. The guide
describes the build, conversion, checking, and cleanup steps. Two examples were
copied from the cleanup guide. They have not been executed in this checkout.

`node validate.cjs` checks the local guide metadata.
`node runtime.cjs` attempts the fixture compiler through an isolated tool path.
No compiler binary is supplied. Do not use host tools or install packages to
fill this deliberate gap. A metadata check cannot prove conversion behavior.
