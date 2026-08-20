# Implement

Implement a spec or ticket as a sequence of complete, test-driven slices.

## Process

1. Read the full source artifact and linked context. State the requested outcome, scope, exclusions, dependencies, and completion criteria.
2. Resolve ambiguity from the codebase first. Use TDD Domain modeling mode when terms, scenarios, or invariants are unclear. Ask the user only for decisions that evidence cannot settle.
3. Identify the interfaces and seams that expose the requested behavior. Confirm the seams before writing tests.
4. Order the work as vertical slices. Each slice delivers one observable behavior through Red-green-refactor mode.
5. During each slice, run the single focused test and the smallest useful typecheck or build check. Do not wait until the end to discover structural errors.
6. After all slices, run the repository's complete required format, lint, typecheck, build, and relevant test commands.
7. Run `code-review` against the spec or ticket. Fix confirmed blockers and rerun every affected check.
8. Load `github` Commit mode. Present the proposed message and intended files, then wait for explicit confirmation before committing.

Do not silently expand scope. When a prerequisite or stop condition invalidates the plan, stop and report the evidence instead of improvising.

Source integrated from `mattpocock/skills`, `skills/engineering/implement/SKILL.md`, read August 19, 2026. Its automatic commit step was replaced with the explicit GitHub Commit gate.
