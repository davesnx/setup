---
name: prepare-pr
description: Understand a branch or make its pull request easy to review without changing behavior. Use for "prepare branch context", "what's on this branch", "summarize this branch", "prepare PR", "make this easy to review", "tidy this PR", "clean up commits", or "annotate the diff". Supports read-only context, review-ready metadata, and explicitly approved history cleanup.
---

# Prepare PR

Build branch context first. Then, only when requested, improve the PR's reviewability without changing its intended tree.

## Modes

- **Context**: Default for understanding and summary requests. Read-only.
- **Review-ready**: Improve the PR description, reviewer guidance, and separation of core versus mechanical changes. Do not edit source code or rewrite history.
- **History cleanup**: Reorganize noisy commits only when the user explicitly asks or approves a proposed plan. Preserve tree identity.

## 1. Resolve The Branch And Base

Read the current branch and working-tree state. Resolve the base branch from the PR when one exists; otherwise use the remote's default branch. Do not assume the base is named `main`.

If there is no branch divergence, no PR, and no uncommitted work, report that there is nothing to prepare and stop.

## 2. Gather Context

Read:

- the full merge-base diff and diff stat
- branch commits in order
- staged and unstaged changes
- changed, generated, mechanical, and high-risk paths
- PR title, body, state, checks, reviews, and unresolved discussion when a PR exists
- linked issues, design docs, migrations, rollout notes, and test evidence when they explain intent

Use `github/scripts/pr-snapshot.ts` and `pr-threads.ts` when available. Otherwise use `git` and `gh` directly.

Understand the actual code changes, not only filenames and commit messages.

## 3. Context Mode

Return:

- branch purpose and current state
- base branch and divergence
- key files and code areas
- important design decisions visible in the diff
- risky behavior, migrations, rollout order, and test coverage
- open PR feedback or unresolved questions
- the best entry point for a reviewer or follow-up task

Make no changes. End by stating that branch context is ready for follow-up work.

## 4. Review-ready Mode

Identify reviewability problems:

- stale or vague PR description
- unclear intent or missing issue links
- core logic mixed with generated or mechanical changes
- risky behavior with no rollout or migration guidance
- missing test evidence
- unrelated changes or a PR too large to review effectively
- no suggested file order or reviewer entry point

Apply safe metadata improvements:

- Write a TL;DR that matches the diff.
- Explain intent, behavior changes, risks, rollout, and tests.
- Separate core files from mechanical or generated files.
- Give reviewers a short reading order.
- Link useful issues, dashboards, designs, or migration docs.

Write PR bodies through a temporary file and `gh pr edit --body-file`; do not inline shell-sensitive Markdown. If notes cannot make the PR reviewable, recommend splitting it instead.

## 5. History Cleanup Mode

Before changing history:

1. Require a clean worktree or protect uncommitted work without modifying it.
2. Fetch the remote head and base.
3. Record `ORIGINAL_TREE=$(git rev-parse origin/<head>^{tree})`.
4. Propose the new commit groups and wait for explicit approval.

Prefer commit groups in dependency order: schema or generated contracts, core logic, integration, user-facing behavior, then tests. Use non-interactive Git commands.

After rewriting:

1. Compare `git rev-parse HEAD^{tree}` with `ORIGINAL_TREE`.
2. Inspect the range diff and status for unintended changes.
3. Run the repository's required validation for the final tree.
4. Do not push if tree identity or validation fails.
5. Force-push only after separate explicit approval, with `--force-with-lease`, and only when host policy permits it.

## Guardrails

- Context mode is always read-only.
- Review-ready mode changes PR metadata only.
- Never hide behavior changes inside review cleanup.
- Never bypass hooks or checks.
- Never include unrelated working-tree changes.
- Preserve the intended source tree during history cleanup.
