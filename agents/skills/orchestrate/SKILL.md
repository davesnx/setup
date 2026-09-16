---
name: orchestrate
description: >
  Coordinate implementation across subagents in one environment, or write an
  orchestrator kickoff. Use when explicitly asked to orchestrate implementation.
  Use council for multiple perspectives on one question; use execute-codebase-plan
  for an existing audit plan. Combine only when explicitly requested.
---

# Orchestrate

The parent owns the outcome. Coordinate children in one working environment;
remain available to the user and resolve follow-ups through completion.
For a kickoff-only request, write the brief without starting implementation.
This skill grants no authority to commit, push, merge, or publish.

## Establish scope

1. Read repository instructions, affected code, callers, and tests. Inspect the
   current diff and identify existing work. Confirm observable completion criteria
   and required checks from the request and repository. No prior plan is required.
2. Use the authorized working path and local permission rules. Preserve unrelated
   changes. If combined with `execute-codebase-plan`, keep all source edits in its
   isolated worktree and leave the main worktree untouched.
3. Map dependencies and assign separate file ownership before starting children.
   Complete critical dependencies first. Give shared types, interfaces, and files
   one owner at a time; establish their contracts before dependent work starts.
4. Prefer one implementer for small or sequential work. Run children in parallel
   only when their tasks and owned paths are independent. If child tools are
   unavailable, report that limit and implement directly when authorized.

## Delegate

Use only model IDs available in the current host. Select a cheaper model for
mechanical work only when model selection is supported. Otherwise use the current
model; do not invent model names, settings, or tool arguments.

Give each child a brief with:

- Task and completion criteria; absolute working path and owned paths.
- Dependencies, agreed interfaces, and any work that must finish first.
- Relevant instructions, constraints, and checks to run.
- An evidence report: changed files, decisions, exact check commands and results,
  unresolved risks, and blockers.

Include these child rules in every brief: perform no Git writes, including
staging, commits, pushes, resets, branch changes, or worktree changes. Concurrent
edits may exist; do not revert others' work or edit outside assigned paths.
Delegate further only for genuinely independent tasks within your ownership,
passing these rules to each child. Otherwise complete the task yourself.

## Coordinate and integrate

Track owners, dependencies, progress, and blockers. Follow up with the same child
when possible. Before retrying or reassigning, inspect its partial changes and
check results; confirm the prior child has stopped editing before handing off.

The parent may integrate results and make small edits. Arrange ownership before
touching a child's files, and do not duplicate work that is still assigned.
Use targeted checks during iteration. When the risk warrants it, request one
independent review focused on security, difficult-to-reverse changes, or affected
behavior. Resolve findings without adding a chain of repeated reviews.

Before completion, the parent directly inspects the full task diff, checks each
criterion, and exercises the integrated result. Run fresh repository-required
checks against the final state; rerun affected checks after further edits.
Child reports alone do not prove success. Report missing evidence as a blocker.
If authorized publishing includes waiting for CI, assign one wait owner: the
parent or one child. Publication remains subject to local checks and permissions.

## Kickoff template

```text
Use orchestrate to deliver [outcome] in [absolute working path].
Done means [observable criteria]. Constraints and exclusions: [limits].
Inspect [relevant code/instructions]; order [dependencies] and assign [owned paths].
Use one implementer unless independent tasks justify parallel children.
Apply this skill's child rules; integrate and verify with [required checks].
Report the outcome, changed files, check evidence, and remaining blockers.
```

Finish with the outcome, files changed, checks and results, and blockers or limits.
