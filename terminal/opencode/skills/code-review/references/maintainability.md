# Maintainability Lens

Review implementation quality, structural simplicity, abstraction boundaries, and long-term codebase health. Working code is not sufficient when the change creates avoidable complexity.

## Review Areas

- Look for a structural simplification that removes branches, helpers, modes, or layers instead of rearranging them.
- Treat a file crossing from below 1,000 lines to above 1,000 lines as a strong smell that needs explicit justification.
- Flag ad hoc conditionals, scattered feature checks, nullable modes, and one-off booleans added to unrelated flows.
- Prefer direct code over magic, generic mechanisms, thin wrappers, identity abstractions, and pass-through helpers.
- Question unnecessary `any`, `unknown`, casts, optional fields, and silent fallbacks that hide the real invariant.
- Keep logic in the package, service, module, or layer that owns the concept. Reuse canonical helpers instead of near-duplicates.
- Separate orchestration from business logic. Flag needless sequential work and related updates that can leave partial state.
- Check whether the change increases coupling, statefulness, concepts, or reader context without a corresponding benefit.

## Preferred Remedies

- Delete an unnecessary layer or wrapper.
- Reframe the state model so conditions disappear.
- Move ownership to the canonical boundary.
- Extract a focused module or pure function.
- Replace repeated conditions with an explicit typed model or dispatcher.
- Collapse duplicate branches and reuse existing helpers.
- Make related updates atomic when partial state is unsafe or harder to reason about.
- Parallelize independent work only when it also makes orchestration clearer.

## Approval Bar

Treat a clear structural regression, unjustified file-size explosion, spaghetti growth, boundary leak, helper duplication, or avoidable cast-heavy contract as a blocker. Do not flood the report with cosmetic nits when larger structural issues exist.
