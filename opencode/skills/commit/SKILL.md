---
name: commit
description: "Use when the user says \"commit\", \"write a commit message\", \"commit changes\", or wants to create a git commit summarizing recent work. Analyzes the diff, recent conversation context, and previous commit history to generate a short, consistent commit message. Accepts an optional \"since\" parameter to control the diff range."
---

# Commit

Generate a concise commit message, validate the exact final change, and create
the commit without bypassing repository hooks.

## Inputs

- `since` (optional): Controls what range of changes to analyze.
  - If omitted, defaults to uncommitted changes on the current branch.
  - If the current branch is `main`, defaults to changes from the last 1 day (`--since="1 day ago"`).
  - Can be a branch name (e.g. `main`), a commit SHA, a time expression (e.g. `"2 days ago"`), or `HEAD~N`.

## Workflow

1. **Determine the current branch and diff range**:

   ```bash
   git branch --show-current
   ```

   - If the user provided a `since` parameter, use it as the base for the diff.
   - If on `main` with no explicit `since`, use time-based: `git log --since="1 day ago" --oneline` and `git diff HEAD~N` where N is the number of commits in that range.
   - If on a feature branch with no explicit `since`, diff against uncommitted changes: `git diff` and `git diff --cached`.

2. **Gather the diff content**:

   ```bash
   # For uncommitted changes:
   git diff --stat
   git diff
   git diff --cached --stat
   git diff --cached

   # For branch-based range (e.g. since=main):
   git diff <since>...HEAD --stat
   git diff <since>...HEAD

   # For time-based range:
   git log --since="<time>" --oneline
   git diff <oldest-commit-in-range>^..HEAD
   ```

   Read the full diff carefully. Understand what files changed, what was added, removed, and refactored.

3. **Determine the repository's validation contract**:

   Read the applicable repository instructions and inspect CI workflows, build
   files, and package scripts. Identify the canonical formatting, linting,
   build/typecheck, and relevant test commands for the changed files. Do not
   infer that comments, documentation, configuration, or other small edits are
   safe without validation.

4. **Review previous commit messages for style**:

   ```bash
   git log --oneline -15
   ```

   Study the commit message patterns:
   - Are they imperative mood? ("Add", "Fix", "Update", "Implement")
   - Do they use prefixes/conventional commits? ("feat:", "fix:", "chore:")
   - Are they short one-liners or multi-line?
   - Do they reference files, features, or behaviors?

   Match the observed style exactly. Do NOT impose a different convention.

5. **Analyze conversation context**:

   Review the recent conversation with the user to understand:
   - What task was being worked on
   - The intent behind the changes (bug fix, new feature, refactor, etc.)
   - Any specific wording the user used to describe the work

   This context helps write a message that captures the "why", not just the "what".

6. **Draft the commit message**:

   - Write a single-line commit message (unless the repo uses multi-line messages).
   - Follow the exact style, casing, and verb tense of previous commits.
   - Focus on the purpose/effect of the changes, not a mechanical list of files.
   - Keep it concise: aim for under 72 characters.
   - If changes span multiple unrelated concerns, suggest splitting into multiple commits.

7. **Present the message and ask for confirmation**:

   Show the user:
   - The proposed commit message
   - A brief summary of what is being committed (files changed, insertions, deletions)

   Ask the user to confirm or adjust before committing.

8. **Validate the final change**:

   After the user's confirmation and after the final file edit, run every
   required command identified in step 3. If any command fails, cannot run, or
   remains ambiguous, stop without committing or pushing and report the exact
   blocker. A failure that also exists on the base branch does not make the
   current tree green.

   After validation, inspect `git status` and the diff again. If validation
   generated or changed files, review those changes and rerun every affected
   check. Any later edit invalidates the corresponding validation result.

9. **Stage and inspect the intended change**:

   Stage only files belonging to the requested change. Do not default to
   `git add -A` in a dirty worktree. Inspect `git diff --cached --stat` and
   `git diff --cached` before committing, and stop if the staged diff contains
   unrelated changes, generated artifacts that were not reviewed, or secrets.

10. **Create the commit**:

   After confirmation:

   ```bash
   git commit -m "<message>"
   ```

   Then verify:

   ```bash
   git status
   ```

## Rules

- NEVER commit without showing the message to the user first and getting confirmation.
- NEVER commit when a required validation command failed, could not run, or was
  not identified. Do not make exceptions for small or comment-only changes.
- NEVER treat a pre-existing baseline failure as green.
- NEVER bypass hooks with `--no-verify`, `-n`, `core.hooksPath`, wrapper scripts,
  hook-disabling environment variables, or equivalent mechanisms.
- NEVER edit files after validation without rerunning the affected checks.
- NEVER include files that look like secrets (.env, credentials, tokens).
- NEVER amend existing commits unless the user explicitly asks.
- NEVER push unless the user explicitly asks and every outgoing commit is based
  on a final tree that passed the required checks.
- If there are no changes to commit, tell the user and stop.
- If the diff is very large, summarize the key themes rather than listing every change.
- Match the repository's commit style exactly. If commits use lowercase imperative ("add feature"), do that. If they use capitalized imperative ("Add feature"), do that. If they use conventional commits ("feat: add feature"), do that.
- When the diff contains multiple unrelated changes, suggest separate commits for each logical unit.
