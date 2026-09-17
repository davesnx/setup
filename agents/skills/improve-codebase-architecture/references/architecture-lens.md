# Architecture Lens

Use the `architect` skill's `references/codebase-design.md` vocabulary: **module**, **interface**, **implementation**, **depth**, **seam**, **adapter**, **leverage**, and **locality**. Read its `deepening.md` reference when dependencies control the design.

Use domain terms from the relevant `CONTEXT.md`. If `CONTEXT-MAP.md` exists, select the mapped context before reading glossary terms or ADRs.

## Where To Look

Weight recently changed and high-churn areas, unless the user named another scope. Look for:

- one concept spread across many shallow modules
- interfaces nearly as complex as their implementations
- callers that must know internal rules
- test-only extraction that leaves production behavior untestable through the real interface
- coupling or feature logic leaking across seams
- duplicate adapters or near-identical abstractions
- missing seams where two real implementations already vary
- seams introduced for only one hypothetical adapter
- repeated workarounds that indicate the current module shape is wrong

Apply the deletion test: if deleting a suspected module makes complexity disappear, it was likely pass-through work; if complexity spreads into callers, the module was earning its keep.

## Architecture Finding Format

In addition to the general finding fields, include the details needed to explain
the proposed change. Select from:

- current modules and interfaces
- where locality or leverage is lost
- the proposed deeper module and smaller interface
- dependency and adapter strategy
- test seam before and after
- ADR conflicts or decisions that must be revisited
- recommendation strength: Strong, Worth exploring, or Speculative

Show the opportunity and evidence during the audit, not a full replacement design.
When the user requests a design or plan, use the relevant domain or design
discipline. Use `architect`'s design-it-twice reference only for requested
alternatives or unresolved tradeoffs; selection alone does not require comparison.
