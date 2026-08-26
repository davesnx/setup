# Commit

Generate a concise commit message, validate the exact final change, and create
the commit without bypassing repository hooks.

## Inputs

- `since` (optional): A branch, commit, tag, or time expression used only as extra context for the message. A new commit always contains selected staged and unstaged changes, never already committed history.

## Workflow

1. **Determine the current branch and diff range**:

   ```bash
   git branch --show-current
   ```

   - Read staged and unstaged changes with `git diff` and `git diff --cached`.
   - If the user provided `since`, inspect that history only to understand context and wording.
   - If there are no uncommitted changes, stop. Do not create a commit from an already committed range.

2. **Gather the diff content**:

   ```bash
   # For uncommitted changes:
   git diff --stat
   git diff
   git diff --cached --stat
   git diff --cached

   # Optional context only:
   git log <since>..HEAD --oneline
   ```

   Read the full uncommitted diff carefully. Understand what files changed, what was added, removed, and refactored.

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

7. **Finalize the commit message**:

   When the user asked to create a commit, use the drafted message and continue
   without asking them to confirm it. If the user asked only for a message or
   plan, provide that output and stop without committing.

8. **Validate the final change**:

   After the final file edit, run every required command identified in step 3.
   If any command fails, cannot run, or remains ambiguous, stop without
   committing or pushing and report the exact blocker. A failure that also
   exists on the base branch does not make the current tree green.

   After validation, inspect `git status` and the diff again. If validation
   generated or changed files, review those changes and rerun every affected
   check. Any later edit invalidates the corresponding validation result.

9. **Stage and inspect the intended change**:

   Stage only files belonging to the requested change. Do not default to
   `git add -A` in a dirty worktree. Inspect `git diff --cached --stat` and
   `git diff --cached` before committing, and stop if the staged diff contains
   unrelated changes, generated artifacts that were not reviewed, or secrets.

10. **Create the commit**:

   ```bash
   git commit -m "<message>"
   ```

   Then verify:

   ```bash
   git status
   ```

## Rules

- Do not pause for commit-message confirmation when the user asked to create a
  commit. Report the message after the commit succeeds.
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
