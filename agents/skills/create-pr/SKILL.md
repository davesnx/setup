---
name: create-pr
description: Use when asked to open, create, submit, or prepare a pull request. Checks the branch and required validation, delegates title/body writing to write-pr-body, and creates a draft PR only with explicit publishing authorization. For title/body text alone, use write-pr-body.
---

# Create a PR

Own branch readiness and the remote PR operation. Load `github` for Git and
GitHub operations, and `write-pr-body` for the title and body. Preparing a PR
does not authorize publishing it.

## 1. Resolve the branch and destination

1. Read repository instructions, contribution guidance, and the PR template.
2. Inspect working-tree and staging state, branch, remotes, and tracking. Resolve
   the repository, head owner/branch, and base from the user's request or existing
   PR. Otherwise use repository configuration or the remote default branch;
   never assume `main`, `master`, or that `origin` is the target repository.
3. Use `gh` to look for an existing open PR for that exact head and base. A
   successful empty result means no PR exists. Authentication, network, or
   repository errors do not; resolve them before proceeding.
4. Fetch the relevant remote refs when needed. Do not merge, rebase, reset, amend,
   or force-push as part of preparation. If the base or destination is ambiguous,
   ask before a write operation.

Proceed when the target, head, base, tracking state, and existing-PR result are
known. Reuse an existing PR rather than create a duplicate. Change its title or
body only when the user's request covers that update; otherwise return its URL.

## 2. Inspect the complete change

Use the resolved base ref, not a guessed branch name:

```sh
git status --short
git log --oneline -10
git log <base-ref>..HEAD --oneline
git diff --check <base-ref>...HEAD
git diff --stat <base-ref>...HEAD
git diff <base-ref>...HEAD
git diff --cached
git diff
```

Read every outgoing commit and the final aggregate diff. Inspect affected code,
callers, linked context, and tests where needed. Confirm one coherent requested
outcome, no secrets, and no unrelated changes. Generated files are acceptable
when required by that outcome; do not discard them merely because they are
generated. An empty aggregate diff means there is no PR to create.

Keep uncommitted work separate. Never stage or commit it merely to create a PR.
If it is intended for this PR, stop for the requested commit workflow. Leave
unrelated work untouched. Flag mixed scope instead of rewriting history or
hiding it in a broad description.

## 3. Establish readiness

Run repository-required formatting, lint, build/typecheck, and relevant tests
against the exact final candidate tree. Checks against a dirty tree do not prove
the committed tree passes. Use an isolated checkout when needed, without moving
or changing the user's uncommitted work.

Confirm regression coverage for a bug fix. If coverage is missing, identify the
gap and return to implementation rather than quietly adding code during PR
preparation. Any source edit invalidates the affected checks. Before pushing,
confirm every outgoing commit satisfies the repository's validation rules.

If a required check fails, cannot run, or its command cannot be determined,
stop before pushing or creating the PR. Report the blocker to the user. Do not
bypass hooks, weaken tests, suppress failures, or use draft status to bypass
this gate.

## 4. Write the title and body

Load `write-pr-body` and give it the resolved refs, final aggregate diff, linked
context, and available code, media, or benchmark evidence. That skill is the
single source of truth for wording. Keep check results in the user-facing
readiness report, not the PR body.

Resolve material unknowns, required-template conflicts, and missing visual or
benchmark comparisons before publishing. Do not invent evidence or create
external tracking merely to fill a PR description.

Write the body to a temporary Markdown file outside the tracked source tree.
Read it back before submission. Keep drafting notes and blockers out of that
file. Use `--body-file` rather than shell-sensitive inline Markdown.

## 5. Publish and verify

Publish only when the user explicitly asks to create or update the PR. If the
candidate is not on the selected remote, push only with explicit authorization
and after the readiness gate passes. Confirm the remote head SHA matches the
reviewed candidate before creating a PR. If it differs, inspect the difference
and repeat the affected checks and writing steps.

Create a draft by default. Set repository, base, and head explicitly; use
`owner:branch` for a fork when supported by `gh`:

```sh
gh pr create --repo <owner/repo> --base <base-branch> --head <head> --draft --title '<title>' --body-file <body-file>
```

Omit `--draft` only when the user asks for ready-for-review. For an authorized
update, change only stale fields within the requested scope. Use the matching
command below; combine flags only when both fields need an authorized update:

```sh
gh pr edit <number> --repo <owner/repo> --title '<title>'
gh pr edit <number> --repo <owner/repo> --body-file <body-file>
```

Read the PR back with `gh` and verify its URL, repository, base, head SHA, draft
state, title, and body. If a write times out or returns an uncertain result,
check remote state before retrying so it cannot create a duplicate.

Return the URL and base branch, plus a short readiness report and any remaining
material risks outside the PR body. Do not assign reviewers, add labels or
attribution, mark an existing draft ready, merge, or change release state unless
the user asks.
