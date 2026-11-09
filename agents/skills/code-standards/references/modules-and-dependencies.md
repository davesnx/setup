# Modules and dependencies

- Things that change together, should stay together.
- Things that change at different rates should be separated.
- Classify code by what would make it change: a business rule, an application
  policy or effect order, a technology translation, or wiring. Split a unit
  when it owns more than one reason, never to satisfy a taxonomy.
- A good interface makes the wrong call look wrong.
- Modules exist to hide decisions, not code.
- Use composition over inheritance.
- Build cohesive modules that hide meaningful behavior, policy, sequencing, or
  translation behind a small caller burden.
- Apply the deletion test. If deleting a module makes complexity disappear, it
  was pass-through waste. If deleting it spreads complexity across callers, it
  earned its keep.
- Keep interfaces narrow and expressed in the caller's terms.
- Reuse an existing integration first. Extend it when the new work belongs to
  the same capability. Create a new one only when reuse would mix ownership.
- Remove modules that only forward calls, rename another API, or mirror storage
  without hiding useful complexity.
- Reuse the codebase's canonical helper instead of writing a near-duplicate.
- Parallelize independent work only when it also makes the orchestration
  clearer, not by default.
- Keep deterministic rules independent of I/O, frameworks, mutable global
  state, ambient time, and randomness. Pass required capabilities explicitly.
- Export the supported public surface and keep implementation details private.
