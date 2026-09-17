---
name: create-pr
description: Use when asked to open, create, submit, or prepare a pull request, or to write or edit a PR title or body. Checks the branch and required validation, writes a short body in the repository's own terms with evidence and a merge-risk line, and creates a draft PR only with explicit publishing authorization. Not for commit messages; use github for those.
---

# Create a PR

Own branch readiness, the title and body, and the remote PR operation. Load
`github` for Git and GitHub operations. Preparing a PR does not authorize
publishing it. When the user asks only for a title or body, run steps 1, 2,
and 4, return the text, and skip the gate and publishing.

Read the global [Green Build Gate](../../AGENTS.md#green-build-gate) and
[Working Style](../../AGENTS.md#working-style) before checking readiness.
They own validation, hook protection, and isolation of unrelated work.

## 1. Resolve the branch and destination

1. Read repository instructions, contribution guidance, the PR template, and
   recent PR titles for local prefixes and grammar.
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
Existing PR prose is a claim to check against the final diff, not proof of what
shipped.

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
callers, and tests where needed. Read linked issues, specifications, and
decisions when available; recover the prior problem and resulting behavior from
evidence, not from filenames, symbols, or titles alone. Confirm one coherent
requested outcome, no secrets, and no unrelated changes. Generated files are
acceptable when required by that outcome; do not discard them merely because
they are generated. An empty aggregate diff means there is no PR to create.

Read the repository's `CONTEXT.md`, or the contexts that `CONTEXT-MAP.md`
points to, when present. Its terms are the language of the title and body.

Keep uncommitted work separate. Never stage or commit it merely to create a PR.
If it is intended for this PR, stop for the requested commit workflow. Leave
unrelated work untouched. Flag mixed scope instead of rewriting history or
hiding it in a broad description.

## 3. Establish readiness

Apply the Green Build Gate to the final candidate and every outgoing commit.
Check the committed tree, not a working tree with additional edits.

Confirm regression coverage for a bug fix. If coverage is missing, identify the
gap and return to implementation rather than quietly adding code during PR
preparation.

Create the PR only after the gate passes, including for drafts. Do not weaken
tests or suppress failures to pass it.

## 4. Write the title and body

Write the final base-to-head outcome as the eventual squash record, for a
reviewer who has not seen the conversation. The body exists to make review
fast: in one screen the reviewer learns what changed, sees proof that it works,
and knows how hard it is to undo. Everything else is optional.

Proceed when the outcome and supporting facts are known. Ask about a material
ambiguity rather than filling it with plausible text.

### Depth

- Narrow, low-risk correction: a precise title, one to three outcome bullets,
  and the risk line.
- Bounded feature or non-obvious local change: add the mechanism, chosen
  tradeoff, or compatibility detail the reviewer needs, plus evidence.
- Difficult, broad, or high-risk work can justify context, the problem-to-decision
  story, concrete invariants, and consequences. Let the review burden justify
  this depth, not line count.

Read [classifying changes](references/classifying-changes.md) when depth is
unclear or security, migration, concurrency, public-contract, or recovery risks
matter. Read [shapes and examples](references/writing-pull-requests.md) when
choosing a structure or including sketches, code, media, or tables. For the
user's own style, read [my pull requests](references/my-pull-requests.md).

### Title

Name the specific outcome across the whole diff, in the repository's terms.
Follow local prefix conventions; otherwise use direct outcome wording. Avoid
vague titles such as "Improve things". Do not invent a character limit.

### Body

Order the body by what the reviewer needs first. Omit any part that adds
nothing, except the risk line:

1. **Outcome.** One to three bullets: what changes and why. Describe only the
   final aggregate change. Exclude intermediate refactors, dropped designs,
   commit chronology, line counts, and tool or agent activity.
2. **Sketch.** When a sketch explains faster than prose, pick the smallest view
   that makes the key point clear and place it next to the text it supports:
   pseudocode for logic, a call tree for runtime flow, a component tree for UI
   structure, a shallow file tree for responsibilities or a broad refactor, a
   Mermaid diagram for interaction or data flow. Show a change to an existing
   shape as a `diff` block of that shape, and the whole block when most of it
   is new. Use one or a few, rarely all. Actual code from the diff beats a
   description of it. Verify every node, edge, and line against the code.
3. **Evidence.** Prove each behavioral claim next to it: the relevant lines of
   test or command output with the command that produced them, a before/after
   image or video table for visual changes, a measured before/after table for
   performance. Name the SHA the evidence came from. A bare "tests pass" is a
   claim, not evidence. Routine format, lint, and typecheck results belong in
   the readiness report, not the body. Missing evidence goes in the report as a
   blocker; never invent, approximate, or paste placeholders.
4. **Risk.** One line naming the merge as a two-way door or a one-way door. A
   two-way door is undone by reverting the merge with nothing else to repair. A
   one-way door leaves something a revert cannot restore: rewritten or migrated
   data, a published version or contract, a deleted resource, a sent message,
   a deploy-order dependency. For a one-way door, name what cannot be undone
   and the rollback path. Do not soften a one-way door to ease the merge.
5. **Review notes.** For a diff a reviewer cannot read top to bottom in one
   pass, give a reading order: the file or function that carries the design
   first, then what follows mechanically. Name the one decision that most
   needs a second opinion. Skip this for a small diff.

Use bullets for text. Add short headings or bold labels only when they help
navigation or the template needs them. Fill a template's sections from the same
facts; report a conflict you cannot resolve in the readiness report and ask
instead of dropping the field silently.

### Domain language

Use the names the reviewer already knows: the glossary terms from `CONTEXT.md`
when it exists, otherwise the names in the code, docs, and linked issues. Do not
use a term the glossary lists under _Avoid_, and do not coin a new name in the
body. When the diff introduces, renames, or redefines a domain term, say so in
the outcome; a vocabulary change is a review point.

### Visual and benchmark evidence

- Visual changes, direct or indirect, need a before/after table: baseline from
  the base ref, candidate from the head, same scenario and viewing conditions,
  refs named. Use only URLs GitHub renders. `gh` cannot upload attachments;
  when the captures exist only locally, hand the files to the user, publish
  without the table, and list it as a blocker in the readiness report. Never
  put local paths, placeholder URLs, or an after-only image in the body.
- Performance claims need both sides measured on the same workload and
  environment, with units, refs, sample count, and uncertainty. A candidate-only
  number cannot establish improvement. Do not fabricate the missing side;
  request the measurement.

### Recheck

Re-read the final diff before returning. If the head or base moved, inspect the
new aggregate diff and revise. Check every claim, snippet, sketch, media label,
measurement, and link against inspected evidence. Remove claims about dropped
code or unsupported motivation.

Write the body to a temporary Markdown file outside the tracked source tree and
read it back before submission. Keep drafting notes and blockers out of that
file. Use `--body-file` rather than shell-sensitive inline Markdown. For a
text-only request, return **Title**, **Body**, and, only when something remains,
**Notes**.

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
