---
name: create-pr
description: Use when asked to open, create, submit, or prepare a pull request, or to write or edit a PR title or body. Checks readiness, uses comment-purge when cleanup is authorized, writes in repository terms with behavioral evidence and a merge-risk line, and publishes a draft only with explicit authorization. Not for commit messages; use github for those.
---

# Create a PR

## 1. Resolve

For a title/body-only request, inspect the supplied diff, specs, and repository
rules, then write the text. Skip `gh`, authentication, publication lookup, and
readiness checks unless a needed fact is unavailable locally; ask for missing
facts rather than make remote access a prerequisite. Return **Title**, **Body**,
and separate **Notes** only for material unknowns. Do not publish.

For PR preparation or publication, load `github` for Git/GitHub operations.
Inspect working-tree and staging state, branch, remotes, and tracking. Resolve
the repository, head owner/branch, and base from the request or existing PR,
then repository configuration or the remote default. Never assume `main`,
`master`, or that `origin` is the destination. Fetch relevant refs when needed.
Ask about an ambiguous destination before any write.

Use `gh` to find an existing open PR for that exact repository, head owner/branch,
and base. Only a successful empty result means none exists; resolve auth,
network, or repository errors. Reuse a match. Update its title/body only within
the user's authority; otherwise return its URL. Preparation does not authorize
publishing, source edits, or commits. Do not merge, rebase, reset, amend, or
force-push as part of preparation.

## 2. Inspect

Read repository instructions, contribution guidance, templates, and available
recent PR titles for local style. Read linked issues, specs, and decisions.
Use `CONTEXT.md` or the contexts in `CONTEXT-MAP.md` for domain terms; otherwise
use code, docs, and issue language. Avoid glossary-disallowed terms and invented
names; identify any introduced, renamed, or redefined term in the outcome.

Inspect status, recent history, every outgoing commit (`<base-ref>..HEAD`), and
the final aggregate diff (`<base-ref>...HEAD`), including its stat and
`git diff --check`. Inspect staged and unstaged diffs separately. Read affected
code, callers, and tests as needed to establish the problem and resulting
behavior. Existing PR prose is a claim to verify, not proof.

Confirm one coherent requested outcome, no secrets, and no unrelated changes.
Keep required generated files. Flag mixed scope; do not hide it in prose or
rewrite history. An empty aggregate diff means there is no PR to create.
Leave unrelated work untouched. Never stage or commit uncommitted work just to
create a PR; if intended work needs a commit, obtain commit authority first.

## 3. Readiness

Read and apply the global [Green Build Gate](../../AGENTS.md#green-build-gate)
and [Working Style](../../AGENTS.md#working-style): they own validation, hook
protection, and isolation. Validate the final committed candidate and every
outgoing commit, not a working tree with extra edits. Confirm regression coverage
for bug fixes. Missing coverage returns the task to implementation.

When cleanup is authorized, read [comment-purge](../comment-purge/SKILL.md) and
apply it to the outgoing diff. A PR-create request alone does not authorize
cleanup. Obtain explicit source-edit and commit authority before the respective
actions; commit authorized cleanup separately through `github`, then repeat
affected inspection and checks. Stop for unresolved cleanup findings or blockers.

Failed, unavailable, or unknown required checks and unsupported behavioral
claims block publication, including drafts. Omit behavioral evidence when there
is no behavioral claim; required repository checks still apply. Report gaps;
do not quietly edit source, weaken tests, or suppress failures. The attachment
exception below applies only to media upload, never to validation or missing captures.

## 4. Write

Write the final base-to-head outcome as the eventual squash record for a reader
without the conversation. Exclude commit chronology, dropped designs, line
counts, and agent activity. Name the specific outcome in the title, with local
prefixes and grammar; do not invent a character limit.

Use this default body, adapting it to the repository template and style:

1. A problem/outcome sentence, or concise outcome bullets in the local style.
2. An optional focused sketch or actual code excerpt when it explains faster
   than prose. Keep it beside the claim it supports and verify it against code.
3. Evidence for behavioral claims: the command and relevant test/output lines
   with the tested SHA, or the comparisons below, beside the supported claim.
4. Important compatibility, migration, or review notes only when needed. For
   complex work, name where to start reading and the decision needing review.
   In drafts, state relevant incomplete behavior and the feedback sought.
5. A required one-line **Risk** statement naming the door and concrete effects.

A **two-way door** needs only a merge revert, with nothing else to repair; name
what the revert restores. A **one-way door** leaves effects a revert cannot
restore, such as rewritten data, published contracts, deleted resources, sent
messages, or deploy-order dependencies; name those effects and the rollback path.

Small changes usually need only outcome, applicable evidence, and risk. Add context,
constraints, mechanism, tradeoffs, and invariants for difficult or high-risk
work; do not force it into one sentence. Omit empty sections, “None”, and
placeholders. Use headings only for navigation or templates. Ask about material
unknowns or unresolved template conflicts; report them outside the body.
Routine formatting, lint, and typecheck results belong in the readiness report.
Never invent evidence or use a bare “tests pass” as proof.

Visual changes, including indirect ones, need verified base/head captures of
the same scenario and viewing conditions, with refs/SHAs named, in a before/after
table using GitHub-renderable URLs. Missing actual baseline or candidate captures
blocks publication of visual claims. **Attachment exception:** when both real
captures exist and readiness passes, but renderable URLs are unavailable, hand
the files to the user, publish without the table, and report pending upload.
This is not a validation blocker. `gh` cannot upload attachments; never substitute
local paths, placeholder URLs, or after-only media in the body.

Performance claims need measured base/head results on the same workload and
environment, with units, refs/SHAs, sample count, and uncertainty. Missing either
side blocks an improvement claim; request measurements rather than guess.
Present the measurements in a before/after Markdown table, with the method beside it.
Read [examples and media details](references/writing-pull-requests.md) as needed,
[depth guidance](references/classifying-changes.md) for complex consequences,
or [the user's PRs](references/my-pull-requests.md) for observed style.

Re-read the final diff and verify every claim, snippet, sketch, label, measurement,
and link. If base or head moved, inspect the new diff and repeat affected checks
and writing. For submission, save the body to a temporary Markdown file outside
tracked source, read it back, and use `--body-file`. Keep drafting notes out.

## 5. Publish

Create or update only with explicit publishing authority. Push only with explicit
push authority after readiness passes. Confirm the selected remote head SHA
matches the reviewed candidate before publishing; otherwise inspect the difference
and repeat affected checks and writing. Recheck the exact existing-PR lookup
before creation to avoid duplicates.

Create a draft by default with `gh pr create --repo <owner/repo> --base <base>
--head <head> --draft --title '<title>' --body-file <file>`. Use `owner:branch`
for forks when supported. Omit `--draft` only for an explicit ready-for-review
request. For existing PRs, use `gh pr edit` with the number and repository,
changing only authorized stale fields via `--title` and/or `--body-file`.

Read back the URL, repository, base, head SHA, draft state, title, and body with
`gh`. After a timeout or uncertain write, inspect remote state before retrying.
Return the URL, base branch, and short readiness report with pending uploads or
material risks. Do not add reviewers, labels, or attribution, mark an existing
draft ready, merge, or change release state unless authorized.
