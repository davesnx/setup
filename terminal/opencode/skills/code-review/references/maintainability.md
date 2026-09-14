# Maintainability Lens

Review implementation quality, structural simplicity, abstraction boundaries, and long-term codebase health. Working code is not sufficient when the change creates avoidable complexity.

Consult `code-standards` when a structural decision needs shared guidance, such as
ownership, unsafe casts, or helper reuse. Apply the relevant sections, not a full
standards pass for every diff. This file adds review-specific checks.

## Review-Specific Checks

- Treat a file crossing from below 1,000 lines to above 1,000 lines as a strong smell that needs explicit justification.
- Check whether the change increases coupling, statefulness, concepts, or reader context without a corresponding benefit.

## Approval Bar

Treat a clear structural regression, unjustified file-size explosion, spaghetti growth, boundary leak, helper duplication, or avoidable cast-heavy contract as a blocker. Do not flood the report with cosmetic nits when larger structural issues exist.
