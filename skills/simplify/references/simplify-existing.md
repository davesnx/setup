# Simplify existing code

Use this path for an explicit cleanup, simplification, YAGNI, bloat, boilerplate,
reuse, or over-engineering request.

## 1. Bound the scope

Use named files or a fixed point when the user supplies them. Otherwise combine
staged and unstaged changed files. If the worktree is clean, compare the current
branch with the merge base of the repository's base branch.

Exclude unrelated files. Stop and report when the scope contains no code.

Complete when the exact file list and comparison point are known.

## 2. Establish the baseline

Read every selected file, its relevant callers and tests, and nearby project
conventions. Identify public contracts and current observable behavior. Search
for an existing canonical helper before proposing reuse or extraction.

Complete when each candidate change has a known behavior to preserve and an
identified owner.

## 3. Find removable complexity

Use these lenses:

### Reuse

- Duplicated logic within or across changed files.
- Copy-pasted behavior that should use one existing owner.
- New helpers that duplicate a canonical path.
- Abstractions that can be replaced by a direct existing path.

### Structure

- Dead code, unused values, unreachable branches, and stale compatibility paths.
- Pass-through wrappers, shallow modules, and abstractions with one use.
- Configuration, extension points, and optional behavior that no requirement or
  caller uses.
- Deep nesting that a guard clause, direct flow, or better state model removes.
- Defensive checks, fallbacks, retries, or catches that are abnormal on a trusted
  path and hide defects.

### Clarity

- Comments that restate code or no longer match it.
- Vague names, several names for one concept, and names that expose machinery
  instead of purpose.
- Intermediate variables or state that obscure the flow rather than explain it.
- Dense expressions that save lines but make behavior harder to see.

### Efficiency

- Repeated computation, lookup, allocation, copying, or I/O with material cost.
- Accidental quadratic work when a direct linear path is clear.
- Missed short-circuiting or unnecessary sequential work.
- Caches, concurrency, or batching added without evidence that they solve a real
  constraint.

Validate each candidate against actual callers and repository conventions.
Discard speculative abstractions, micro-optimizations, and changes that only
move complexity elsewhere.

Complete when every retained candidate names the code to remove or replace, the
reason it is simpler, and the behavior it preserves.

## 4. Apply focused edits

Edit by default. Apply clear behavior-preserving reductions. Apply optional
style changes only when they are local and reduce code or cognitive load. Keep
edits inside the selected scope unless the shared owner of a root cause lies
outside it. Report an outside root cause and cross the boundary only after the
user expands the scope.

If the pass finds a bug that requires a behavior change, report it instead of
hiding the fix inside cleanup unless the user also asked to fix bugs.

Complete when the selected complexity is removed without changing required
behavior or public contracts.

## 5. Verify and report

Run the repository checks required by the main skill. Report the files changed,
the concepts or code removed, and the evidence that behavior stayed intact.

Complete when checks pass and the summary contains only verified claims.
