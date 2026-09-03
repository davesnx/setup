# Maintainability Lens

Review implementation quality, structural simplicity, abstraction boundaries, and long-term codebase health. Working code is not sufficient when the change creates avoidable complexity.

The shared quality bar — pass-through wrappers, casts that hide invariants, reuse of canonical helpers, and structural simplification over rearrangement — is defined in [Simplify's standards](../../simplify/references/standards.md). Apply it here; this file adds only the checks specific to reviewing a diff.

## Review-Specific Checks

- Treat a file crossing from below 1,000 lines to above 1,000 lines as a strong smell that needs explicit justification.
- Check whether the change increases coupling, statefulness, concepts, or reader context without a corresponding benefit.

## Approval Bar

Treat a clear structural regression, unjustified file-size explosion, spaghetti growth, boundary leak, helper duplication, or avoidable cast-heavy contract as a blocker. Do not flood the report with cosmetic nits when larger structural issues exist.
