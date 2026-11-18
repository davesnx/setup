# Merge Conflicts

## Trigger

Branch has unresolved merge conflicts and needs a reliable path to a buildable state.

## Workflow

1. Identify the active operation from Git state: merge, rebase, cherry-pick, or revert. Read `git status` and list unmerged paths with `git diff --name-only --diff-filter=U`.
2. Read each conflict in context. Compare the base, ours, and theirs versions when the intent is unclear. Do not assume "ours" means the current feature in a rebase.
3. Resolve conflicts with minimal, correctness-first edits. Preserve compatible intent from both sides; when intent conflicts, use surrounding code, commits, tests, and the user request to choose explicitly.
4. Regenerate lockfiles, generated code, and derived artifacts with their owning tools instead of hand-editing conflict markers.
5. Search the resolved files for conflict markers and run `git diff --check`.
6. Run the repository-defined format, lint, typecheck, build, and relevant tests for the final resolved tree.
7. Stage only resolved files. Continue the merge, rebase, or cherry-pick only when the user asked to complete it and all required checks pass.

## Guardrails

- Keep changes minimal and readable.
- Do not leave conflict markers in any file.
- Avoid broad refactors while resolving conflicts.
- Do not discard either side wholesale without checking its intent.
- Do not bypass hooks or validation.
- Do not push or tag during conflict resolution unless the user separately asks after completion.

## Output

- Files resolved
- Notable resolution choices
- Build/test outcome
- Whether the Git operation was continued or remains staged for user review
