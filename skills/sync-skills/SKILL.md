---
name: sync-skills
description: Sync shared agent skills between the local Mac and nspawn through the setup Git repository. Use when the user says "sync skills", "push skills", "send skills to nspawn", "update nspawn skills", or asks to synchronize OpenCode, Claude, Codex, or Agent Skills across these machines. On local, commit and push skill changes, then pull them on nspawn. On nspawn, commit and push skill changes only.
compatibility: Requires Git and an SSH host named nspawn. Uses /Users/davesnx/Code/github/setup on local and /home/me/workplace/davesnx/setup/repo on nspawn.
---

# Sync Skills

Synchronize the skill directories through Git: `skills/` (shared by every
harness) and `terminal/opencode/skills/` (OpenCode-only skills). Below, "the
skill directories" means exactly those two paths. A sync request authorizes the required commit, push, SSH connection, and pull, but no
other repository changes.

## Safety Rules

- Load the `github` skill before the first commit and follow its commit checks.
- Stage and commit only paths under the skill directories.
- Leave unstaged changes outside the skill directories unchanged.
- Stop if the index already contains a path outside the skill directories; do not unstage
  someone else's work to make the sync continue.
- Stop on an unresolved conflict, failed check, failed push, dirty nspawn
  checkout, branch mismatch, or failed pull.
- Sync only the `main` branch. Stop on another branch instead of publishing it
  as part of this machine-to-machine workflow.
- Do not stash, reset, force-push, rebase, merge, resolve a conflict, or bypass a
  hook. Report the blocker instead.

## 1. Identify The Machine

Run `uname -s` and select exactly one mode:

- `Darwin`: local mode. Use `/Users/davesnx/Code/github/setup`.
- `Linux` with `HOME=/home/me`: nspawn mode. Use `/home/me/workplace/davesnx/setup/repo`.
- Any other result: stop and ask which mode applies.

Verify that the selected directory is a Git worktree for the setup repository.
Work from its top level for all later commands. Verify that the current branch
is `main`, its upstream is `origin/main`, and `origin` is the expected setup
repository.

## 2. Inspect Before Staging

Inspect `git status --short --branch`, the unstaged and staged diffs under
the skill directories, the staged path list for the whole repository, and
`git log --oneline -10`.

Stop if Git reports an unresolved conflict. Stop if any already-staged path is
outside the skill directories. Unstaged non-skill changes are allowed because
the sync does not stage them. Inspect every outgoing commit in
`origin/main..HEAD` and stop if any of those commits contains a path outside the
skill directories; a skills sync must not
publish unrelated local commits.

## 3. Validate And Commit Skill Changes

If the skill directories have changes:

1. Stage only the skill directories with
   `git add -- skills terminal/opencode/skills`.
2. Inspect the staged diff and confirm that every staged path is under the
   skill directories.
3. Determine and run the repository-required format, lint, build, and relevant
   test commands for the staged files. Use check-only modes when available. If
   a required formatter writes files, limit it to the skill directories, then inspect the
   full worktree and staged diff again. Also run `opencode debug skill` when the `opencode` command is available, and
   `git diff --check --cached`.
4. Commit with a concise message that describes the staged skill changes.
5. Inspect the created commit's path list and confirm that every path is under
   the skill directories. Inspect status after the commit and compare it with the pre-commit
   status. If a hook added a non-skill path to the commit, changed unrelated
   files, or left required checks stale against the final tree, stop and report
   it.

If the skill directories have no changes, do not create an empty commit. Continue so an
existing local commit can still be pushed and, in local mode, pulled by nspawn.

## 4. Push

Recheck every commit in `origin/main..HEAD` and confirm that each changed path
is under the skill directories. Then push the explicit non-force refspec
`HEAD:refs/heads/main` to `origin`. Do not add an upstream, change branches, or
force the push without explicit user approval.

Stop if the push fails.

## 5. Update Nspawn From Local

Skip this section in nspawn mode.

In local mode, first inspect nspawn without modifying it:

```sh
ssh nspawn 'cd "$HOME/workplace/davesnx/setup/repo" && git branch --show-current && git status --porcelain=v1'
```

Compare the remote branch with the branch that was pushed. Stop if they differ.
Stop if the porcelain status contains any output; a dirty remote checkout can
make a pull unsafe.

When the branch is `main` and the checkout is clean, run one remote command that
repeats both checks immediately before the pull:

```sh
ssh nspawn 'cd "$HOME/workplace/davesnx/setup/repo" && test "$(git branch --show-current)" = main && test -z "$(git status --porcelain=v1)" && git pull --ff-only origin main'
```

If the pull fails for any reason, stop. Do not try to repair the remote
checkout. If it succeeds, verify the remote branch status and HEAD commit.

## Report

Report:

- selected mode and repository path
- created commit hash and message, or that no skill changes needed a commit
- push result
- nspawn pull result and HEAD in local mode
- the exact blocker when the workflow stopped
