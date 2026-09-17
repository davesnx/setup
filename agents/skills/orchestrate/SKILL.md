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
Only the parent performs authorized Git writes. This skill grants no authority
to commit, push, merge, or publish.

Only when requested completion includes a merge-ready PR, read
[PR follow-through](references/pr-follow-through.md). Readiness is separate from
merge authority.

## Establish scope

1. Read repository instructions, affected code, callers, and tests. Inspect the
   current diff and identify existing work. Confirm observable completion criteria
   and required checks from the request and repository. Set the completion boundary
   and any stop or time bounds. No prior plan is required.
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
- Work-item state, next checkpoint, and applicable stop or time bounds.
- An evidence report: changed files, decisions, exact check commands and results,
  unresolved risks, and blockers.

Include these child rules in every brief: perform no Git writes, including
staging, commits, pushes, resets, branch changes, or worktree changes. Concurrent
edits may exist; do not revert others' work or edit outside assigned paths.
Delegate further only for genuinely independent tasks within your ownership,
passing these rules to each child. Otherwise complete the task yourself.
Report descendants to the parent and pass user stop or hold orders to them.

## Coordinate and integrate

Use the existing task tracker; do not require a separate ledger file. Each work
item records its state, owner, owned paths, dependencies, last concrete progress
evidence, and next action. Use these states or the tracker's equivalents:

- `queued`: waiting for assignment or dependencies.
- `running`: an owner is working within its paths.
- `blocked`: record the obstacle and what will clear it.
- `ready-for-verification`: the worker finished; parent verification is pending.
- `verified`: the parent verified the integrated outcome against the criteria.
- `stopped`: termination is confirmed; retain partial work and the reason.

At checkpoints or task-appropriate bounds, compare evidence: file changes,
findings, command output, and check results. If progress is unclear, inspect the
worker and its partial work, then request a concrete status and next action.
Elapsed time alone does not prove a stall. Do not require fixed polling or timers.
Follow up with the same child when possible; unblock or narrow its task before
replacement. Inspect partial changes and check results before retrying or
reassigning; confirm termination of the prior worker and its descendants before
handing off ownership.

On user stop or hold, stop dispatch and writes immediately. Send the order to all
descendants and use available host controls to interrupt active work and waits.
Track acknowledgements and actual termination separately; a sent request is not
proof of a stop. If interruption is unavailable or unconfirmed, mark the item
`blocked`, report that limit, keep ownership reserved, and do not start a
conflicting replacement. Resume held work only when the user releases it, after
checking actual worker and file state.

The parent may integrate results and make small edits. Arrange ownership before
touching a child's files, and do not duplicate work that is still assigned.
Use targeted checks during iteration. When the risk warrants it, request one
independent review focused on security, difficult-to-reverse changes, or affected
behavior. Resolve findings without adding a chain of repeated reviews.

Before completion, the parent directly inspects the full task diff, checks each
criterion, and exercises the integrated result. Run fresh repository-required
checks against the final state. Record the exact commit, base, and uncommitted
state checked: staged and unstaged diffs plus relevant untracked files. Confirm
that state still matches before accepting evidence. Changes to the head, base,
dependencies, or integration invalidate affected checks, even with an unchanged
patch-id. Return affected items to `ready-for-verification` and rerun those checks.
Child completion and reports alone do not prove success. Report missing evidence
as a blocker. Only the parent marks the integrated outcome `verified`.

## Kickoff template

```text
Use orchestrate to deliver [outcome] in [absolute working path].
Done means [observable criteria and local or merge-ready PR boundary].
Constraints, authority, and stop/time bounds: [limits].
Inspect [relevant code/instructions]; order [dependencies] and assign [owned paths].
Use one implementer unless independent tasks justify parallel children.
Track each item's state, owner, paths, dependencies, last evidence, and next action
in [existing task tracker]. Set task-appropriate checkpoints.
Apply this skill's child rules; integrate and verify with [required checks].
Pin evidence to the exact commit, base, and uncommitted state; recheck after changes.
Report the outcome, changed files, check evidence, and remaining blockers.
```

Finish with the outcome, files changed, checks and results, and blockers or limits.
