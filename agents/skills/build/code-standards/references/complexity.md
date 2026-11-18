# Complexity

- Keep architecture proportional to the real problem. Start with the smallest
  honest implementation of the use case, often a direct script or one vertical
  slice.
- Judge an abstraction by total system cost: lines, interfaces, files, call
  hops, configuration, tests, and the concepts a reader must learn. Ten obvious
  lines spread over five files is negative value.
- Make code usable before reusable. Extract a helper, port, service, or module
  only after real examples expose the shared shape, or when it owns a real
  invariant, hides real complexity, or has several real implementations.
- Duplication is cheaper than the wrong abstraction (Sandi Metz). Constrain
  first, generalize later.
- After correctness, intention, and duplication, prefer the fewest classes,
  functions, and names.
- A pattern name is vocabulary for a design that emerged, not a requirement to
  manufacture that design.
- Keep behavior local. A reader learns what a unit does by reading it, not by
  searching distant files.
- Prefer one obvious path and one source of truth.
- Justify guards, fallbacks, retries, and race handling with documented contracts,
  reachable failure paths, or observed failures. An incident is not required to
  protect a known boundary or invariant. Use the smallest safeguard at its owner.
- Weigh the failure's likelihood and impact against the safeguard's cost.
  Speculation alone does not justify a general defense system.
- Change internal call sites rather than preserve a bad interface.
- Prefer less code, fewer names, fewer branches, and net-negative diffs when
  behavior permits. Remove a branch, helper, mode, or layer rather than
  rearrange it.
