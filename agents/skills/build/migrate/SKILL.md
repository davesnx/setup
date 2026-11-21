---
name: migrate
description: Plan and run codebase migrations and multi-file refactors in safe phases and reviewable batches. Use for framework upgrades, dependency major versions, API renames across a repository, deprecation removal, or config and tool migrations. Not for database schema migrations.
---

# Migrate

Apply one well-defined transform across many files. Ship it in phases and batches that each pass the checks and can be reverted on their own.

## When to use

- Framework upgrade (React 18 → 19, Node 20 → 22).
- Dependency major version or deprecation removal.
- API rename across a repository (`getUserById` → `users.byId`).
- Config or tool migration (webpack → vite, jest → vitest, eslint → biome).
- Any task that changes many files the same way and must ship in slices a reviewer can read.

## Prerequisites

Local tools: `git`, `rg`, the language's AST codemod tool (`ast-grep`, `ts-morph`, `jscodeshift`, `comby`), and the repository's test runner.

## Plan

1. **Read the target.** Read the changelog and migration guide of the new version. List every breaking change, removal, and behavior change.
2. **Define the transform precisely.** Bad: "migrate to vitest." Good: "replace `jest.mock` with `vi.mock`, `jest.fn()` with `vi.fn()`, and rename `jest.config.js` to `vitest.config.ts` from template X."
3. **Measure the blast radius.** List the direct users, the code that depends on them, the tests that cover them, and config or build files that name the target.
   ```bash
   rg -l 'jest\.(mock|fn|spyOn)' | wc -l
   rg -l 'from "jest"' | sort
   ```
4. **Split into phases.** After each phase the code compiles, all tests pass, and both old and new paths work. Default order:

   | Phase | Content |
   |---|---|
   | 1 | Add the new version beside the old |
   | 2 | Add compatibility shims, only when users must run on both |
   | 3a…3N | Migrate users in waves: leaf users first, then users that depend only on migrated ones |
   | 4 | Remove the shims |
   | 5 | Remove the old version |

5. **Record a baseline.** Run the full test suite and a clean build. Save the passed, failed, and skipped test counts, the warning count, and the list of tests that already fail.
6. **Write the records:**
   - `.workplace/plans/<slug>_PLAN.md`: breaking changes, blast radius, baseline, the codemod path, and links to the phase tasks.
   - `.workplace/tasks/<NN>-migrate-<slug>-phase-<N>.md`, one per phase: what it changes, how to revert it, its acceptance criteria, and the command that verifies them.
   - `.workplace/status.md`: one line per plan and per task, state `ready`.
   - `.workplace/decisions.md`: choices that are hard to reverse, such as "no shims" or "skip deprecated API X".
7. **Get approval.** Show the plan to the user. Do not start Phase 1 without it.
8. **Open a tracking issue** on the repository's tracker.

## Execute in batches

Phases run in order, never in parallel. Inside a phase, loop: pick N files, transform, check, commit, next batch.

```bash
rg -l 'jest\.mock' | grep -vxFf done.list | head -25 > batch.list
```

- **Pilot first.** Run the codemod on about 5 files and review the diff before full batches. Grow the batch while batches stay clean. Keep each diff under about 400 lines.
- **Keep the codemod in a file** in the repository or the plan folder, so every batch runs the same transform. Commit the codemod output and hand edits separately.
- **Stop when the codemod misses too much.** When more than a third of a batch needs hand edits, fix the codemod, not the files.
- **Check each batch:** typecheck or build, plus the tests for the changed files.
- **Name things the same way:** branch `migrate/<slug>-<NN>`, commit message `migrate(<slug>): <transform> (batch NN)`.
- **Pull requests:** open one per batch only when the user asks. Otherwise batches are commits on the branch.

Before a phase, set its task to `active` in `status.md`. After it, run the full test suite, then set `done`, or `blocked` with the reason. When a phase fails, revert it and stop for the user.

After an interruption or context compaction, read `status.md` and the plan, restart any phase still `active`, and continue with the next `ready` phase.

## Safety rails

- **One transform per commit or pull request.** Never mix a rename with a format change.
- **Keep a `done.list`** of migrated files so the next batch skips them.
- **Run the full test suite between phases** and on the last batch, even when batches ran only the changed tests.
- **Codemod first, hand edits second.** Note hand-patched files in the commit or pull request body.
- **Roll back per batch or phase**, not globally. Each commit must revert cleanly.
- **Keep the shims until every user is migrated**, and remove them only after the user approves.

## Verification loop

After each batch:

```bash
rg 'jest\.(mock|fn|spyOn)' | wc -l
```

The count must fall toward 0.

After each phase:

- Run the checks yourself. A subagent's report of success is not evidence.
- Compare with the baseline. Test and warning counts must be the same or better. A check that ran zero tests fails.
- Run the changed path once from input to output, not only the tests.
- During shim phases, check that the old and new paths both work and that the shim tests pass. After cleanup, only the new path may exist.

Before Phase 5, search source, config, docs, and lockfiles for the old pattern. The count must be 0.

At the end, report:

- files migrated out of the total,
- files edited by hand,
- deferred items,
- test and warning counts before and after.

## Stop and ask the user

- A phase fails after its revert.
- Tests fail for reasons not related to the migration.
- A shim test fails: the shim design is wrong.
- The plan needs a change.

## Troubleshooting

- **Regex codemod matches too much**: use AST tooling (`ast-grep`, `ts-morph`) for structural matches.
- **Tests pass locally, CI fails**: match tool versions between local and CI (`.nvmrc`, `pyproject.toml`).
- **Diff too big to review**: halve the batch size.
- **Conflicts between batches**: rebase the open batch before merging the current one. Never force-push a merged batch.
