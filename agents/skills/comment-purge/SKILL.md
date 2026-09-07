---
name: comment-purge
description: "Use only for an explicit user request to clean up code comments or run Comment Purge, even on hosts that ignore disable-model-invocation. Delete unnecessary comments, review exceptions, and fix accepted in-scope causes. Not for general code review or refactoring."
disable-model-invocation: true
license: MIT
---

# Comment Purge

Delete unnecessary comments rather than rewrite them. Keep protected comments
and fix the code problems that accepted findings expose.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base
branch, default `main`, including staged and unstaged working-tree changes.
If no usable base exists, ask for one or an explicit scope. Do not widen a diff
to whole files or widen the scope to other instances of a problem.
Read repository rules and record the existing changes before editing. Preserve
pre-existing user work; stop and ask if edits conflict. No automatic Git writes.

## Deletion Rules

- Delete narration, section banners, commented-out dead code, workaround
  explanations, and explanations of internal code that needs a clearer design.
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
- After investigation, delete comments with no proven exception, including
  ambiguous warnings. Internal surprises need a code change, not shorter prose.
  These deletion rules never override protected directives or legal notices.
- Use neutral action flags such as `Refactor`, `Fix suppression`, or
  `Unenforced constraint`. Name the exact in-scope symbol, evidence, and needed
  change. Do not invent defects or label intentional behavior as faulty.

## Workflow

1. Use an available independent reviewer when supported. Pass the exact scope,
   existing-change baseline, and all deletion and review rules in this skill.
   Otherwise use separate comment-edit and review passes yourself. The initial
   reviewer edits comments only, never application code, and reports touched
   files, deleted comment count, action flags with evidence, and skips.
2. The parent reviews the report and diff. Reject application-code edits, scope
   escapes, protected deletions, unsupported flags, and missed suppressions.
   Check evidence for both deleted and kept warnings. Restore a comment only
   with an exact exception and scoped proof; do not restore internal-code
   explanations because the refactor is still open. Delete refuted or ambiguous
   keeps after investigation. Preserve valid action flags for internal surprises.
3. For a rejected pass, undo only that pass's rejected edits, preserving the
   baseline and concurrent user changes. Name the failure and allow one corrected
   pass. If it is rejected again, remove its rejected edits, report the work open,
   and stop with failure. Ask if edits cannot be separated safely.
4. The parent fixes accepted trivial causes directly: remove a dead path, drop
   an unused parameter, or use the correct API. For larger refactors, first sketch
   the proposed structure using surrounding code, then make the smallest in-scope
   root-cause fix. Remove the named workarounds, not just their explanations.
   Do not add symptom guards. If a cause is outside scope, make only a sound
   in-scope fix and report the remaining work; do not widen scope to finish it.
5. Retain proven external constraint comments. For unprotected constraints such
   as wording freezes or approval warnings, offer the cheapest in-scope type,
   runtime check, test, or CI rule. Ask before encoding it; unattended execution
   needs explicit caller pre-approval, never implied consent. If approved, encode
   the constraint and delete the comment. Otherwise delete the unprotected warning
   and report the remaining unenforced constraint. Sketch out-of-scope work only.
6. After the final edit, run required repository formatting, lint, build/typecheck,
   and relevant test commands from repository instructions and CI configuration.
   Review the final diff for scope, protected comments, directives, and user work.
   Fix in-scope failures; report failed, unavailable, or unknown required checks
   as blockers. Do not claim successful cleanup while required checks fail or
   remain unverified, or while correctness or safety findings remain unresolved.

## Report

Report touched files, deleted comment count, restored comments with exceptions,
corrected passes, refactor sketches, fixes, encoding offers and approvals,
completed encodings, unenforced constraints, skips, and other open work.
Include check commands and results. Distinguish completed cleanup from blockers.
