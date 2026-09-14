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

1. Use an available independent reviewer when supported. Pass the exact scope,
   existing-change baseline, and all deletion and review rules in this skill.
   Otherwise use separate comment-edit and review passes yourself. The initial
   reviewer edits comments only, never application code, and reports touched
   files, deleted comment count, action flags with evidence, and skips.
2. The parent reviews the report and diff. Reject application-code edits, scope
   escapes, protected deletions, unsupported flags, and missed suppressions.
   Check evidence for deleted warnings and restore any removed without sufficient
   evidence. Keep explanations while their constraint or refactor is unresolved.
   Delete refuted warnings only when the evidence establishes safe removal.
   Preserve valid action flags for internal surprises.
3. For a rejected pass, undo only that pass's rejected edits, preserving the
   baseline and concurrent user changes. Name the failure and allow one corrected
   pass. If it is rejected again, remove its rejected edits, report the work open,
   and stop with failure. Ask if edits cannot be separated safely.
4. Within the authorized scope, the parent fixes accepted trivial causes: remove
   a dead path, drop an unused parameter, or use the correct API. For larger
   refactors, first sketch
   the proposed structure using surrounding code, then make the smallest in-scope
   root-cause fix. Remove the named workarounds, not just their explanations.
   Do not add symptom guards. If a cause is outside scope, make only a sound
   in-scope fix and report the remaining work; do not widen scope to finish it.
5. Retain proven external constraint comments. For unprotected constraints such
   as wording freezes or approval warnings, offer the cheapest in-scope type,
   runtime check, test, or CI rule. Ask before encoding it; unattended execution
   needs explicit caller pre-approval, never implied consent. If approved, encode
   and verify the constraint before deleting a now-redundant comment. Otherwise
   preserve the warning and report the remaining unenforced constraint. Sketch
   out-of-scope work only.
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
