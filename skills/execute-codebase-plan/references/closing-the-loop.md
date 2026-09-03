# Closing the Loop

This reference owns review, execution, reconciliation, and publication after an
audit plan exists. The audit skill owns discovery, prioritization, HTML reports,
and initial plan authoring.

## Shared Preflight

1. Confirm that the repository is a Git repository and resolve the absolute
   path of the user's main worktree.
2. In the main worktree, record:
   - `git rev-parse HEAD`
   - `git status --porcelain=v1`
   - `git diff --binary`
   - `git diff --cached --binary`
   - the path and content hash of each existing untracked, non-ignored file
3. Read the full plan and its index. Extract the planned-at commit, dependencies,
   in-scope and out-of-scope files, current-state excerpts, steps, verification
   commands, done criteria, and STOP conditions. This plan schema is defined by
   improve-codebase-architecture's `references/plan-template.md`; change the two
   files together.
4. Confirm the planned-at commit exists. Check each dependency against the index
   and current code, not only its status label.
5. Run the plan's drift check as a read-only command. Compare its current-state
   excerpts with live code. If either differs, stop execution and use Reconcile.
6. Confirm each verification command exists in repository documentation or
   configuration. Do not guess replacement commands silently.

Store baseline artifacts under the OS temp directory, not in the repository. Do
not fetch, pull, install dependencies, run generators, format files, or write
status metadata in the main worktree.

## Isolated Worktree

Create a unique temporary parent directory and add a worktree below it from the
main worktree's recorded HEAD. Use a unique branch such as
`execute-plan/<plan-slug>-<timestamp>`:

```sh
parent=$(mktemp -d "${TMPDIR:-/tmp}/execute-codebase-plan.XXXXXX")
git worktree add -b "execute-plan/<slug>-<timestamp>" "$parent/worktree" <main-head>
```

The worktree path must not be inside the user's main worktree. Before every edit
or mutating command, confirm that its working directory resolves to the isolated
worktree. Use absolute paths when dispatching another agent. If the plan is
uncommitted or absent at the recorded HEAD, inline its full text in the executor
prompt or copy it into the isolated worktree; never make the executor depend on
an uncommitted main-worktree file.

Leave the worktree and branch available for review. Do not remove them unless the
user explicitly authorizes cleanup.

## Review Plan

Review the plan against current code and return one verdict:

- **APPROVE**: Evidence is current; scope is exact; dependencies are satisfied;
  steps, checks, done criteria, and STOP conditions are complete and consistent.
- **REVISE**: The finding remains valid, but the plan has correctable gaps. Name
  each gap and the exact plan section that needs a change.
- **BLOCK**: The finding no longer exists, a dependency is unmet, the approach
  conflicts with a repository decision, or safe execution needs wider scope.

Review is read-only by default. If the user asks to revise the plan, create an
isolated worktree and change only the plan files there. Re-run this review on the
revised plan.

## Execute

After Shared Preflight passes:

1. Create the isolated worktree from the recorded main HEAD.
2. Re-run the drift check in that worktree before editing.
3. Follow the plan in order. Run each step's verification before the next step.
   Stop on any plan STOP condition; do not expand scope to work around it.
4. Keep all source, test, generated, dependency, and plan-status writes in the
   isolated worktree.
5. When implementation ends, inspect `git status`, the full diff, and the list of
   changed files from the isolated worktree.
6. Fail scope validation if any source file is outside the plan's in-scope list.
   A documented plan-file or lockfile change is acceptable only when the plan
   required it.
7. Run every done criterion and the repository-defined format, lint, typecheck,
   build, and relevant test commands. Read new tests to confirm that they prove
   the planned behavior.
8. Compare the implementation with "Why this matters" and the named repository
   conventions. A passing command does not compensate for solving the wrong
   problem.

Use these verdicts:

| Verdict | Condition | Action |
|---|---|---|
| **APPROVE** | Criteria pass, scope is clean, and the plan's intent is met | Leave changes in the worktree and report integration options. |
| **REVISE** | Correctable gaps remain | Fix only in the same worktree, then repeat all affected checks. |
| **BLOCK** | A STOP condition, unmet dependency, unsafe scope expansion, or unrecoverable check failure occurs | Leave evidence in place and report the blocker. |

Documented deviations are judged against plan intent and scope. Undocumented
deviations fail review.

## Reconcile

Read the index and every referenced plan, then compare them with current code:

- **DONE**: Spot-check the done criteria. Report whether current code still meets
  them.
- **BLOCKED**: Verify the blocker. Recommend a bounded plan revision or rejection.
- **IN PROGRESS**: Check whether the recorded worktree still exists and whether
  it has changes. Do not remove or take over that worktree without authorization.
- **TODO**: Run the drift check and verify that the finding still exists. Mark a
  vanished finding as a rejection rather than recreating work.

Reconciliation is read-only unless the user asks to update plan files. Put any
such updates in a new isolated worktree and report its path. Do not update the
main-worktree copies.

## Publish

Publication requires an explicit request that names the existing plan or selected
plans and the target tracker.

For GitHub issues:

1. Confirm `gh auth status`, the GitHub remote, target repository, and visibility.
2. Check the plan and index for an existing issue URL, then search for a matching
   open issue. Do not publish a duplicate.
3. If a public issue would disclose a vulnerability, credential location, private
   system detail, or other sensitive evidence, show the redacted title and ask
   for a second explicit confirmation.
4. Show the exact issue titles and target repository before creation.
5. Create issues only for the selected plans. Use existing labels only; do not
   create or change repository labels as a side effect.
6. Report each URL. If the user asked to record URLs in plan files, make those
   edits in an isolated worktree.

Publishing issues does not authorize commits, pushes, pull requests, or merges.

## Integration Authorization

Approval means the worktree is ready for the user; it is not integration
authorization. A commit, push, pull request, merge, or cleanup needs an explicit
request for that action. Keep commits on the isolated branch. Push only the named
branch to the named remote. Never force-push.

Do not merge into a branch checked out in the user's main worktree. If an
authorized integration cannot occur without changing that worktree, stop and
return the blocker or commands for the user. Authorization never waives the
main-worktree boundary.

## Final Main-Worktree Check

Re-run the five Shared Preflight snapshots in the main worktree and compare them
with the baseline. Do not revert a difference because it can be concurrent user
work. Report the exact difference and withhold the claim that the main worktree
was unchanged.
