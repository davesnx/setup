# Commit

Generate a concise commit message, validate the exact final change, and create
the commit without bypassing repository hooks. By default, commit only the work
from the current session. Leave unrelated changes out, whether they existed
before the session or were made during it by the user, another agent, or another
process. Expand this scope only when the user explicitly asks.

## Inputs

- `since` (optional): A branch, commit, tag, or time expression used only as extra context for the message. A new commit always contains selected staged and unstaged changes, never already committed history.

## Workflow

1. **Determine the current branch and diff range**:

   ```bash
   git branch --show-current
   ```

   - Inspect `git status`, including untracked files, and read staged and
     unstaged changes with `git diff` and `git diff --cached`.
   - Identify the session's work from the conversation, edit history, and any
     starting diff. A file's modification time or staged state does not prove
     that its changes belong to this session. If ownership is unclear, ask
     before including the uncertain changes.
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

   - Write a single-line subject (unless the repo uses multi-line messages). Add
     any trailer the harness requires (for example a `Co-Authored-By:` line)
     with a second `-m`; a trailer does not make it a multi-line message.
   - Follow the exact style, casing, and verb tense of previous commits.
   - Focus on the purpose/effect of the changes, not a mechanical list of files.
   - Keep it concise: aim for under 72 characters.
   - Describe only the selected session work. If that work spans multiple
     unrelated concerns, suggest splitting it into multiple commits.

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

   Stage only the session's changes. If a file also contains unrelated edits,
   stage only the relevant hunks; do not stage the whole file. If the edits
   cannot be separated with confidence, stop and ask. Do not use `git add -A`
   or `git commit -a` to collect changes from a dirty worktree.

   Preserve unrelated work and its staged state. If unrelated changes are
   already staged, use an isolated index or worktree for the selected change;
   do not unstage someone else's work or include it in the commit. Validate
   the exact selected tree under step 8 before committing.

   Inspect the selected index with `git diff --cached --stat` and
   `git diff --cached` before committing. Stop if it contains unrelated
   changes, generated artifacts that were not reviewed, or secrets.

10. **Create the commit**:

   ```bash
   git commit -m "<subject>"
   # with a harness-required trailer:
   git commit -m "<subject>" -m "<trailer>"
   ```

   Then verify:

   ```bash
   git status
   ```

## Rules

- Follow the Green Build Gate in the repository's global agent rules
  (`AGENTS.md`/`CLAUDE.md`) for validation, hook, and push-readiness
  requirements.
- Do not pause for commit-message confirmation when the user asked to create a
  commit. Report the message after the commit succeeds.
- NEVER include files that look like secrets (.env, credentials, tokens).
- NEVER amend existing commits unless the user explicitly asks.
- NEVER push unless the user explicitly asks.
- If there are no changes from the current session to commit, tell the user
  and stop, even if unrelated changes remain.
- If the diff is very large, summarize the key themes rather than listing every change.
- Match the repository's commit style exactly. If commits use lowercase imperative ("add feature"), do that. If they use capitalized imperative ("Add feature"), do that. If they use conventional commits ("feat: add feature"), do that.
- When the selected session work contains multiple unrelated changes, suggest
  separate commits for each logical unit.
