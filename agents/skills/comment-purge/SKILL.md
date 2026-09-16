---
name: comment-purge
description: "Remove unnecessary code comments when explicitly requested. Preserve meaningful warnings, contracts, and directives. Not general code review or refactoring."
disable-model-invocation: true
license: MIT
---

# Comment Purge

Delete unnecessary comments rather than rewrite them. Keep protected comments
and unresolved warnings. Fix exposed code problems only within the authorized
scope; comment cleanup alone does not authorize behavior changes.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base
branch, default `main`, including staged and unstaged working-tree changes.
If no usable base exists, ask for one or an explicit scope. Do not widen a diff
to whole files or widen the scope to other instances of a problem.
Read repository rules and record the existing changes before editing. Preserve
pre-existing user work; stop and ask if edits conflict. No automatic Git writes.

## Deletion Rules

- Delete narration, section banners, commented-out dead code, and explanations
  shown to be redundant, false, or obsolete. Keep a workaround's explanation
  until evidence shows the constraint is obsolete or an authorized fix removes it.
- Keep legal and license notices and doc comments that define public API contracts.
- Keep verified non-obvious constraints from an external dependency, platform,
  vendor, or protocol that this project cannot change.
- Keep issue or RFC links that explain constraints code cannot express.
- Preserve formatting directives and functional build, compiler, and tool
  directives. Comment syntax does not make an instruction safe to delete.
  Diagnostic suppressions follow the separate rule below.
- Inspect every scoped suppression, including `eslint-disable`, `@ts-ignore`,
  and `@ts-expect-error`. Read the rule and evidence. Keep false-positive,
  faulty-rule, or style-only suppressions. Correctness or safety suppressions
  need removal and a root-cause fix, not a replacement that hides check failures.
- Investigate `IMPORTANT`, `do not remove`, `too risky`, `fine for now`, and long
  justifications. Trace nearby code, exact symbols, callers, tests, and available
  issue or dependency evidence. A claimed external constraint needs proof that
  it still applies on a live path. Do not depend on a named skill or command.
- Preserve ambiguous warnings when the evidence does not establish that removal
  is safe. Report the missing evidence or proposed code change. These deletion
  rules never override protected directives or legal notices.
- Use neutral action flags such as `Refactor`, `Fix suppression`, or
  `Unenforced constraint`. Name the exact in-scope symbol, evidence, and needed
  change. Do not invent defects or label intentional behavior as faulty.

## Workflow

1. Make clear, bounded comment-only deletions directly. Use an independent
   read-only reviewer when a disputed warning, suppression, or distinct contract
   needs separate investigation. Preserving an unresolved warning does not require
   delegation. Give a reviewer the exact scope, existing-change baseline, and
   applicable rules; ask for evidence, not edits. If no reviewer is available,
   do a separate review pass yourself.
2. Inspect the resulting diff against the deletion rules. Restore your own
   unsupported deletions and reject unauthorized code changes or scope expansion.
   Preserve baseline and concurrent user changes; ask if they cannot be separated.
   Allow one corrected pass. If it fails again, remove only its rejected edits
   and report the work incomplete. Keep explanations while their constraints
   remain unresolved.
3. Fix exposed code problems only when authorized. Use the smallest root-cause
   change within scope; sketch larger refactors first. Do not widen the scope or
   add symptom guards. Offer a type, runtime check, test, or CI rule for an
   unenforced constraint when useful. Encoding requires explicit approval, including
   in unattended runs. Preserve its warning until approved encoding is verified.
   Proven external-constraint comments remain protected.
4. After the final edit, run required repository formatting, lint, build/typecheck,
   and relevant test commands from repository instructions and CI configuration.
   Review the final diff for scope, protected comments, directives, and user work.
   Fix in-scope failures; report failed, unavailable, or unknown required checks
   as blockers. Do not claim successful cleanup while required checks fail or
   remain unverified, or while correctness or safety findings remain unresolved.

## Report

Briefly report changed files, removed comments, and check commands and results.
Mention preserved warnings, skips, corrections, approvals, or other open work
when they occurred. Distinguish completed cleanup from unresolved constraints
and blockers; omit empty report categories.
