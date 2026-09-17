# Maintainability Lens

Review implementation quality, structural simplicity, abstraction boundaries, and long-term codebase health. Working code is not sufficient when the change creates avoidable complexity.

Consult `code-standards` when a structural decision needs shared guidance, such as
ownership, unsafe casts, or helper reuse. Apply the relevant sections, not a full
standards pass for every diff. This file adds review-specific checks.

## Review-Specific Checks

- Investigate growth when it mixes responsibilities or makes a change require
  unrelated context. Line count alone does not establish a structural defect.
- Check whether the change increases coupling, statefulness, concepts, or reader context without a corresponding benefit.

## Approval Bar

Calibrate structural findings by their effect on callers, ownership, change
cost, and failure risk. Boundary leaks, duplicated behavior, or cast-heavy
contracts can block a change when the evidence shows meaningful impact.
Explain that impact instead of treating a pattern name as proof. Keep cosmetic
nits out of the way of real regressions.
