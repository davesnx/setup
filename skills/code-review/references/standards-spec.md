# Standards And Spec Lenses

Keep these axes separate. A change can follow every repository standard while implementing the wrong behavior, or implement the requested behavior while violating the repository's conventions.

## Standards

Read repository instructions such as `AGENTS.md`, `CONTRIBUTING.md`, coding standards, architecture docs, and local conventions. Repository rules override generic guidance. Skip rules already enforced by tooling unless the configuration itself changed.

Use these smells as judgment prompts, not hard violations:

- Mysterious names that hide behavior or ownership.
- Duplicated logic shapes that need one shared implementation.
- Feature envy or logic living away from the data it owns.
- Data clumps and primitive values standing in for domain concepts.
- Repeated switches or condition families that indicate a missing model.
- Shotgun surgery and divergent modules with unrelated reasons to change.
- Speculative abstractions, hooks, or parameters with no current requirement.
- Message chains, middlemen, and inheritance that obscures the real target.

For each standards finding, cite the repository rule or name the smell and explain why it matters in this change.

## Spec

Find intent from the user request, issue, PR description, commit messages, linked spec, or matching files under `docs/`, `specs/`, and `.scratch/`. If no spec exists, state that and continue with the other lenses.

Check for:

- Missing or partially implemented requirements.
- Behavior that contradicts the requested outcome.
- Scope creep or behavior that was not requested.
- Requirements that appear implemented but fail on an edge case.
- Tests that prove a different contract from the stated requirement.

Quote or cite the relevant requirement for every spec finding.
