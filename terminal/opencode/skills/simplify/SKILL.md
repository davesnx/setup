---
name: simplify
description: "After working on code, ensure the changes contain only the minimal, idiomatic edits. Simplify or refactor existing code while preserving its required behavior, and remove AI-generated slop introduced by you. Use for explicit cleanup, refactoring, removal of unnecessary complexity, or a request to use Simplify"
---

# Simplify

Review the diff and remove changes that are slop: unnecessary, non-idiomatic, or
inconsistent additions that do not contribute to the intended feature or fix.
Reduce the code and concepts the project must maintain while preserving the
contract. Keep the smallest change that accomplishes the goal, and match the
local conventions of each touched file.

For a review-only request, report findings without edits. For prose cleanup,
use Unslop. When another workflow owns the task, preserve its edit boundary.
When the cleanup changes boundaries, persistence, error handling, or state
models, load the `code-standards` skill.

## 1. Bound the scope

Use named files or a fixed point when the user supplies them. Otherwise combine
staged and unstaged changed files. If the worktree is clean, compare the current
branch with the merge base of the repository's base branch.

Exclude unrelated files. Stop and report when the scope contains no code.

Complete when the exact file list and comparison point are known.

## 2. Establish the baseline

Read every selected file, its relevant callers and tests, and nearby project
conventions. For each changed hunk, determine the intended behavior change.
Identify public contracts and current observable behavior. Search for an
existing canonical helper before proposing reuse or extraction.

Apply the lenses below directly for a bounded change. Use independent read-only
reviewers when separate parts or risks justify parallel work, not because a
file-count threshold was crossed. Give each reviewer a distinct question, exact
scope, and required `file:line` evidence.

Complete when each candidate change has a known behavior to preserve and an
identified owner.

## 3. Find removable complexity

Prefer deletion or existing code, then language or platform features,
established dependencies, and direct local code. Add an abstraction or
dependency only when a demonstrated need outweighs its maintenance cost. Keep
one-use behavior direct. Split code by responsibility, not file size.

Use these lenses:

### Reuse

- Duplicated logic within or across changed files.
- Copy-pasted behavior that should use one existing owner.
- New helpers that duplicate a canonical path.
- Abstractions that can be replaced by a direct existing path.

### Structure and quality

- Unused imports, values, parameters, dead code, unreachable branches, and stale
  compatibility paths.
- Pass-through wrappers, shallow modules, and abstractions with one use.
- Configuration, extension points, and optional behavior that no requirement or
  caller uses.
- Deep nesting that a guard clause, direct flow, or better state model removes.
- Defensive checks, fallbacks, retries, or catches that are abnormal on a trusted
  path and hide defects.
- `any`, casts, optional values, or ignored errors used to bypass a type or
  invariant.

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

Weight the review toward any user-supplied focus, such as errors, duplication,
naming, memory, or performance. Preserve validation, diagnostics, security,
accessibility, compatibility, and intentional behavior. A shorter implementation
that drops these is not a simplification. Report a correctness issue separately
when it requires a behavior change.

Validate each candidate against actual callers and repository conventions.
Merge overlaps and rank significant duplication, structural confusion, unsafe
type escapes, or material inefficiency as high; clear local readability,
naming, nesting, dead-code, or consistency gains as medium; and optional style
as low. Discard speculative abstractions, micro-optimizations, and changes that
only move complexity elsewhere.

Complete when every retained candidate names the code to remove or replace, the
reason it is simpler, and the behavior it preserves.

## 4. Apply focused edits

Edit by default. Before editing, give one compact summary grouped by file. Apply
high and medium behavior-preserving reductions. Apply low findings only when
they are local and reduce code or cognitive load. Align each edit with local
style: naming, typing, error strategy, and comment density. Do not add
dependencies.

Keep edits inside the selected scope unless the shared owner of a root cause
lies outside it. Report an outside root cause and cross the boundary only after
the user expands the scope. Rename public interfaces or change behavior only
when the user authorizes that change. If the pass finds a bug that requires a
behavior change, report it instead of hiding the fix inside cleanup unless the
user also asked to fix bugs.

Complete when the selected complexity is removed without changing required
behavior or public contracts.

## 5. Verify and report

After the final edit, run the repository's formatters, linters, and tests for
the preserved behavior, and introduce no new warnings. Inspect the diff for
unrelated changes and confirm it still satisfies AGENTS.md and other repository
policies.

Report in one to three sentences: what was removed or reused, what stayed
unchanged, and which checks passed or could not run. No bullet points, no
emojis, no extended explanation. Mention rejected or deferred candidates only
when they explain an important tradeoff.

Example:

> Removed redundant input checks and log-and-rethrow blocks added in this
> branch, and inlined single-use helpers to match existing style. No functional
> behavior changes beyond the intended diff; all edits were confined to the
> branch's modified hunks.

Complete when checks pass and the summary contains only verified claims.
