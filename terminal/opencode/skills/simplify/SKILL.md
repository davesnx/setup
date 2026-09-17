---
name: simplify
description: "Simplify code while preserving behavior when asked for cleanup, refactoring, or Simplify. Not an automatic post-edit pass or prose cleanup."
---

# Simplify

Remove unnecessary code and concepts while preserving the contract. Prefer the
smallest change that meets the goal and matches the local conventions.

For a review-only request, report findings without edits. For prose cleanup,
use Unslop. When another workflow owns the task, preserve its edit boundary.
Load `code-standards` when a cleanup decision needs its guidance on boundaries,
persistence, error handling, or state models, not for every edit in those areas.

## 1. Bound the scope

Use named files or a fixed point when the user supplies them. Otherwise combine
staged and unstaged changed files. If the worktree is clean, compare the current
branch with the merge base of the repository's base branch.

Exclude unrelated files. Stop and report when the scope contains no code.

## 2. Establish the baseline

Read every selected file, its relevant callers and tests, and nearby project
conventions. For each changed hunk, determine the intended behavior change.
Identify public contracts and current observable behavior. Search for an
existing canonical helper before proposing reuse or extraction.

Work directly by default. Use independent read-only reviewers only when the user
asks for them or separate questions justify the coordination cost. File count
alone is not a reason. Give each reviewer a distinct question, exact scope, and
required `file:line` evidence; prohibit edits and Git writes. Verify their claims
yourself before editing because a suggestion is not proof of safe replacement.

## 3. Find removable complexity

Prefer deletion or existing code, then language or platform features,
established dependencies, and direct local code. Add an abstraction only when
a demonstrated need outweighs its maintenance cost. Keep one-use behavior
direct. Split code by responsibility, not file size.

Use these lenses where the code gives a reason to investigate:

- **Reuse and ownership:** duplicated logic, helpers that repeat an existing
  path, and pass-through abstractions with no useful responsibility.
- **Structure:** unused code or options, stale compatibility paths, nesting,
  redundant state, and type escapes or catches that hide a broken invariant.
- **Clarity:** misleading names or comments, obscured control flow, and dense
  expressions that save lines at the cost of understanding.
- **Efficiency:** material repeated work, avoidable quadratic paths, and caches
  or concurrency whose complexity has no demonstrated benefit.

Weight the review toward any user-supplied focus, such as errors, duplication,
naming, memory, or performance. Preserve validation, diagnostics, security,
accessibility, compatibility, and intentional behavior. A shorter implementation
that drops these is not a simplification. Report a correctness issue separately
when it requires a behavior change.

Validate each candidate against actual callers and repository conventions.
Remove defensive checks only when the trusted contract makes them redundant;
their appearance alone does not establish that. Retain candidates with a clear
replacement, a reason it is simpler, and evidence of the behavior it preserves.
Prioritize meaningful reductions over optional style. Discard speculative
abstractions, micro-optimizations, and changes that only move complexity elsewhere.

## 4. Apply focused edits

For a cleanup request, apply the supported behavior-preserving reductions. For
a review-only request, report them without edits. Explain material tradeoffs
before editing; a small local cleanup needs no separate proposal. Match local
naming, typing, error handling, and comment style. Do not add dependencies.

Keep edits inside the selected scope unless the shared owner of a root cause
lies outside it. Report an outside root cause and cross the boundary only after
the user expands the scope. Rename public interfaces or change behavior only
when the user authorizes that change. If the pass finds a bug that requires a
behavior change, report it instead of hiding the fix inside cleanup unless the
user also asked to fix bugs.

## 5. Verify and report

After the final edit, run the repository-required checks for the affected code
and focused tests of the behavior being preserved. Check relevant outputs,
errors, input mutation, and state across repeated calls. Choose checks that can
detect a changed contract, not just confirm shorter code. Introduce no new
warnings. Inspect the final diff for unrelated changes and compliance with
repository rules. In review-only work, verify recommendations without editing
the source.

Report what was removed or reused, the checks run and their results, and any
material tradeoff or verification limit. Let length and layout fit the scope.
Claim completion or preserved behavior only to the extent the evidence supports
it; report failed or unavailable checks rather than implying they passed.
