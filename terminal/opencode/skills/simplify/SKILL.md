---
name: simplify
description: "Simplify or refactor existing code while preserving its required behavior. Use for explicit cleanup, refactoring, removal of unnecessary complexity, or a request to use Simplify. Ordinary feature work, bug fixes, and code questions use the normal engineering rules without loading this skill."
---

# Simplify

Reduce the code and concepts the project must maintain while preserving the
contract. Correctness and safety take priority over fewer lines.

## Scope

Identify the behavior, public interfaces, and checks that must stay unchanged.
Read [references/simplify-existing.md](references/simplify-existing.md) for
existing-code cleanup. If the cleanup changes boundaries, persistence, or error
handling, also read [references/standards.md](references/standards.md).

For a review-only request, report findings without edits. For prose cleanup,
use Unslop. When another workflow owns the task, preserve its edit boundary.

## Choose the smaller solution

Prefer deletion or existing code, then language or platform features, established
dependencies, and direct local code. Add an abstraction or dependency only when
a demonstrated need outweighs its maintenance cost.

Remove dead paths, repeated work, pass-through wrappers, and speculative options.
Keep one-use behavior direct. Split code by responsibility, not arbitrary file
size. Preserve validation, diagnostics, security, accessibility, compatibility,
and intentional behavior. A shorter implementation that drops these is not a
simplification.

## Verify the result

Use the repository's checks and tests for the preserved behavior after the final
edit. Inspect the diff for unrelated changes. Report what was removed or reused,
what stayed unchanged, and which checks passed or could not run. Rename public
interfaces or change behavior only when the user authorizes that change.
