# Comment And Fix

Both run after the report, on confirmed findings only. **Dismissed** and
**Consider** items stay in the report.

## Comment

Post one PR review that holds every confirmed finding, so the author gets one
notification:

1. Get the head commit: `gh pr view <n> --json headRefOid -q .headRefOid`.
2. Map each finding to a line on the PR's right side (`side: RIGHT`). GitHub
   only accepts lines inside a diff hunk. A finding outside every hunk goes in
   the review body with its `file:line`.
3. Write each comment body as: severity, the failure, the execution path, and
   the remedy. Use a `suggestion` block only for a fix of a few lines that is
   complete and correct as written.
4. Post with event `COMMENT`, or with `REQUEST_CHANGES` or `APPROVE` only when
   the user asked for that verdict:

   ```sh
   gh api repos/{owner}/{repo}/pulls/<n>/reviews --input review.json
   ```

   `review.json` holds `commit_id`, `event`, `body` (the verdict and the
   findings outside the hunks), and `comments`, an array of
   `{path, line, side, body}`. Use `start_line` and `start_side` for a range.
5. Before posting, list the PR's existing review comments
   (`gh api repos/{owner}/{repo}/pulls/<n>/comments`) and leave out a finding
   that one of them already raises.

Report the review URL. On a 422 error, move the rejected comments to the body
and post again; do not drop them.

## Fix

1. Start from a clean or known state: record `git status` and `git diff --stat`
   so the user can tell your edits from theirs. Stop if a file you must change
   has uncommitted edits you did not make, unless the user said to work on top.
2. Fix findings in severity order, each with the smallest change that removes
   the failure the finding names. Leave unrelated code as it is.
3. After each fix, run the proof that confirmed the finding, then the
   repository's focused checks for that area. A fix that fails its proof is
   reverted and reported as not applied.
4. Leave the changes uncommitted unless Ship is also selected.

Report each finding as **fixed** (with the check that passed), **not applied**
(with the reason), or **needs a decision** (when the remedy changes behavior
the user must choose).
