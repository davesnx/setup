# Design It Twice

Use this comparison workflow for requested alternatives or when unresolved
constraints or hard-to-reverse risks could change the design. A direct design is
enough when evidence already determines the shape.

Uses the vocabulary in [codebase-design.md](codebase-design.md) — **module**, **interface**, **seam**, **adapter**, **leverage**.

## Process

### 1. Frame the problem space

Name the decision the comparison must resolve, then share a brief containing:

- The constraints any new interface would need to satisfy
- The relevant callers, evidence, and dependencies (see [deepening.md](deepening.md) when dependencies control the design)
- A rough illustrative code sketch to ground the constraints — not a proposal, just a way to make the constraints concrete

Use the same evidence and acceptance criteria for every candidate.

### 2. Develop distinct candidates

Choose only as many candidates as there are meaningful competing shapes; two
often suffice. An explicit request for multiple alternatives requires distinct
alternatives, even if one looks strongest early.

Use parallel read-only runners when explicitly requested or when independent
design questions justify the extra work. Otherwise compare directly. Give runners
[runner-prompt.md](runner-prompt.md), the shared brief, and one distinct constraint
each. For example, compare a minimal interface with one optimized for a proven
extension need. Do not invent flexibility requirements to make candidates differ.

Use available models only as needed for those questions. If parallel tools or
requested models are unavailable, state the limit and compare directly; do not
label sequential reasoning as independent model evidence.

Use the project's domain vocabulary and the relevant terms from
[codebase-design.md](codebase-design.md).

Each candidate includes:

1. Usage example showing how callers use it
2. Interface (types, methods, params — plus invariants, ordering, error modes)
3. What the implementation hides behind the seam
4. Dependency strategy and adapters (see [deepening.md](deepening.md))
5. Trade-offs — where leverage is high, where it's thin

### 3. Present and compare

Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated — the user wants a strong read, not a menu.
