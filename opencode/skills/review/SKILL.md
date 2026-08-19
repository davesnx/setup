---
name: review
description: 'Code review of local changes or a specific PR for bugs, logic errors, edge cases, and style issues. Use when the user says "review", "code review", "review my changes", "review PR", or wants feedback on code correctness. Also handles deep audits ("thermo nuclear", "thermonuclear", "thermos", "deep review") by running both thermo-nuclear rubrics as parallel subagents, and shipping ("review and ship") by running tests, committing, and opening or updating a PR. Accepts an optional PR number or URL (e.g. "/review", "/review 123", "/review https://github.com/org/repo/pull/123").'
---

# Review

Perform a thorough code review focused on correctness, catching bugs and logic errors that simplification alone would miss.

## Inputs

- `$ARGUMENTS` (optional):
  - If empty: review uncommitted local changes.
  - If a number (e.g. `123`): review that PR number on the current repo.
  - If a URL (e.g. `https://github.com/org/repo/pull/123`): review that PR.
- Mode, inferred from the request:
  - **standard** (default): single-pass review, report only.
  - **thermo**: the user says "thermo", "thermonuclear", "thermos", or "deep review". Run the parallel deep audit (step 3b).
  - **ship**: the user says "review and ship" or asks to commit/PR after review. After the review, run tests, fix criticals, commit, and open or update a PR (step 6).

## Workflow

### 1. Determine what to review

**No arguments (local changes):**

```bash
git diff --stat
git diff
git diff --cached --stat
git diff --cached
```

If no uncommitted changes, try the branch diff:

```bash
git fetch origin main
git diff main...HEAD --stat
git diff main...HEAD
```

**PR number or URL:**

```bash
# For a PR number:
gh pr diff $ARGUMENTS

# For a URL, extract the PR number and repo:
gh pr diff <number> --repo <owner/repo>

# Also fetch PR context:
gh pr view $ARGUMENTS --json title,body,comments
```

### 2. Read the full diff

Read every line of the diff carefully. For each changed file, also read surrounding context (the full file if small, or the relevant functions if large) to understand the broader picture.

### 3a. Review for issues (standard mode)

Examine the changes for the following categories:

**Critical (must fix):**

- Bugs: incorrect logic, off-by-one errors, null/undefined access, race conditions
- Security: injection, auth bypass, exposed secrets, unsafe deserialization
- Data loss: missing error handling on destructive operations, unchecked writes

**Warning (should fix):**

- Edge cases: unhandled empty inputs, boundary conditions, error paths
- Logic errors: inverted conditions, wrong operator, missing break/return
- Concurrency: shared mutable state, missing locks, async ordering issues
- Error handling: swallowed errors, missing cleanup, broad catch blocks
- Type safety: unsafe casts, missing null checks, implicit any

**Note (consider):**

- Style inconsistencies with the surrounding codebase
- Missing or misleading comments
- Naming that doesn't match behavior
- Test coverage gaps for new logic
- Performance concerns in hot paths

### 3b. Deep audit (thermo mode)

Instead of a single pass, launch two subagents in parallel (same message, both via the Task tool), passing each the same scoped diff plus the file/context excerpts it needs to evaluate the change without guessing:

- One subagent instructed to read `~/.agents/skills/thermo-nuclear-review/SKILL.md` and apply that rubric: bugs, breaking changes, security vulnerabilities, devex regressions, feature-flag leaks.
- One subagent instructed to read `~/.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` and apply that rubric: maintainability, structure, file-size growth, spaghetti conditions, abstraction quality.

Ask each to return prioritized findings with file references and evidence. After both finish, synthesize: deduplicate across reviewers, weight overlapping findings more heavily, resolve disagreements with your own judgment, and keep summaries brief. Surface the unified verdict and the highest-signal findings rather than restating both reports wholesale.

### 4. Present findings

Format the review as a structured report:

```
## Review Summary

**Files reviewed:** <count>
**Findings:** <critical count> critical, <warning count> warnings, <note count> notes

### Critical
- **[file:line]** <description of the issue>
  Suggestion: <how to fix>

### Warnings
- **[file:line]** <description>
  Suggestion: <how to fix>

### Notes
- **[file:line]** <description>
```

If there are no findings, say the changes look good and briefly explain what you checked.

### 5. Offer to fix (standard and thermo modes)

After presenting findings, ask the user if they want you to fix any of the critical or warning items. Do NOT auto-fix in these modes -- they are about review, not modification.

### 6. Ship (ship mode only)

Only when the user asked to ship:

1. Run targeted tests for the changed behavior. If no focused tests exist, decide whether to add them or document the gap.
2. Fix critical findings and re-run affected tests.
3. Commit selective files with a concise message. Keep commits focused; avoid unrelated file changes. If pre-commit checks fail, fix the issues rather than bypassing hooks.
4. Push the branch and open or update a PR. Judge readiness with `gh pr checks --json name,bucket,state,workflow,link` (not GitHub Actions-only commands).
5. Report: findings summary, tests run and outcomes, PR URL.

## Rules

- Do NOT make any changes to files unless in ship mode or the user explicitly asks after seeing the review.
- Be specific: always include file paths and line numbers.
- Be actionable: every finding must include a concrete suggestion for how to fix it.
- Be calibrated: do not flag style preferences as critical. Reserve "critical" for actual bugs and security issues. Prioritize correctness, security, and regressions over style-only comments.
- Do NOT review files that are not part of the diff.
- If reviewing a PR, consider the PR description and comments for context on intent.
- If the diff is very large (50+ files), summarize high-level observations first, then deep-dive into the most risky files (or switch to thermo mode's parallel subagents).
