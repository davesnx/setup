---
name: pr-review
description: Use when asked to review a pull request as a maintainer, or to self-review your own branch before create-pr. Gates fit and scope, runs built-in /code-review for the bug pass, checks the OCaml public API for semver breaks, applies an OCaml/Reason checklist, and writes a local report with a verdict. Not a generic bug hunt (use /code-review), simplification (/simplify), or security review (/security-review).
---

# PR review

A maintainer review adds what a bug pass misses: does the change belong, does
it break users, and is each finding worth the author's time. Every step below
runs in order. The output is a local report; nothing is posted.

## 0. Target

- **Maintainer mode**: someone else's PR, given as a number, URL, or branch.
  Read it with `gh pr view <n> --json title,body,author,baseRefName,headRefOid,files,closingIssuesReferences,comments`
  and `gh pr diff <n>`. Fetch the head with `git fetch <remote> pull/<n>/head`.
- **Self-check mode**: the current branch, before [create-pr](../create-pr/SKILL.md).
  Head is the working tree plus `HEAD`.

The diff base is `git merge-base <remote>/<base> <head>`, so base-branch
changes since the fork do not count as the PR's. Leave the user's checkout
where it is: every other tree in this skill is a separate `git worktree`.
Load [github](../github/SKILL.md) for non-trivial `gh` commands.

Done when base, head SHA, and the full changed-file list are known.

## 1. Maintainer gate

Read the PR body, linked issues, earlier discussion, and `git log` of the
touched areas. Answer:

- Should this exist? Is the problem real and stated?
- Does it fit the project's direction and the area's design?
- Is it one coherent change, at the right size and layer?

When an answer is no, the verdict is **redirect**: say what the project needs
instead (an issue first, a split, another layer, a smaller change) and stop.
Line review of a change that should not land wastes both sides' time. In
self-check mode, ask the same questions of your own branch.

## 2. Bug pass

Run built-in `/code-review` on the target (the PR number or branch) at its
default effort, without `--comment` or `--fix`. Carry its findings into
step 5. It owns bug hunting; this skill adds no second bug hunt. On a host
without `/code-review`, write `Bug pass: not run, /code-review unavailable on this host`
in the report.

## 3. OCaml public API and semver

Run when the diff touches a library with a dune `public_name`, an `.opam`
file, `dune-project` dependencies, a ppx, or a `melange.emit` target.

1. Create a base worktree:
   `git worktree add --detach "$(mktemp -d "${TMPDIR:-/tmp}/pr-review-base.XXXXXX")" <merge-base>`.
   In maintainer mode, create a head worktree the same way at the head SHA.
2. Run `dune build` on head. A failing head build is a blocking finding.
3. Diff every public `.mli` and `.rei` between base and head. A public module
   with no interface file exports everything: compare its inferred interface
   (`ocaml-print-intf`, or `ocamlc -i` through `dune exec`) or list it under
   declined to judge.
4. Diff `public_name` stanzas in `dune` files, `depends` in `*.opam` and
   `dune-project`, ppx sources, and `melange.emit` targets.
5. Remove the worktrees with `git worktree remove`.

**Breaking** for downstream code:

- New constructor in a public variant: breaks exhaustive matches.
- New field in a public record: breaks record construction.
- New value or type in a public module type: breaks its implementations.
- Removed or renamed value, type, module, or `public_name`.
- Narrower type: a parameter type that accepts less, or a result that
  promises more.
- Raised opam lower bound.
- Changed ppx expansion or Melange JS output that users compile against.

**Possibly breaking**: a new value in a module that users `open` or
`include`, which can shadow their own names.

A removal needs an earlier release with `[@@deprecated "use X"]`. Every
user-visible change needs a `CHANGES.md` entry. Report each break with the
version bump it requires.

## 4. OCaml/Reason checklist

Apply each item to the changed lines:

- A `_` or catch-all pattern over a variant the project owns, which hides the
  exhaustiveness check when a constructor is added.
- `[@warning "-8"]` or another disabled partial-match warning.
- `Obj.magic` without a stated invariant that proves the cast.
- `with _ ->` or `| exception _ ->` that swallows unexpected errors.
- `Option.get` or `List.hd` where `None` or `[]` is reachable.
- A new library use without its `libraries` entry in `dune`, or a test-only
  dependency missing `{with-test}`.
- Melange code where value identity matters, such as React hook dependency
  arrays: apply [melange-advanced](../../stack/melange-advanced/SKILL.md).

For other design questions, consult [code-standards](../../build/code-standards/SKILL.md).

## 5. Precision filter

Each finding from steps 2 to 4 keeps all four parts: `file:line`, the quoted
line, the cause, and the impact on a user or maintainer. Drop:

- Issues the diff did not introduce. Mention a severe one once, as a `note`.
- What the compiler, a warning, or ocamlformat already reports.
- Nits and taste.
- Comment quality: [comment-purge](../comment-purge/SKILL.md) handles it.

Verify every blocking finding before reporting it: reproduce it, run the
failing case, or trace the path, with [verify-this](../../build/verify-this/SKILL.md).
A blocking finding that does not verify becomes a `question` or is dropped.

Done when every remaining finding has its four parts and every blocking one
has evidence.

## 6. Report

Write the report in the session. Sections, in order:

1. **Verdict**: approve, request changes, or redirect, with one sentence why.
   In self-check mode, approve means ready for create-pr.
2. **Findings**, in [Conventional Comments](https://conventionalcomments.org/)
   form, blocking first: `issue (blocking): <subject>` then location, quote,
   cause, impact, and evidence. Labels: `issue`, `suggestion`, `todo`,
   `question`, `thought`, `note`, `praise`; decorate each `(blocking)` or
   `(non-blocking)`.
3. **API and semver**: breaks, possible breaks, deprecation and `CHANGES.md`
   status, required bump. Or why step 3 did not run.
4. **Questions for the author**: what the diff and PR text leave open.
5. **Coverage ledger**: every changed file, marked reviewed or skipped with the
   reason (generated, vendored, lockfile, out of expertise).
6. **Declined to judge**: areas where you lack the context to rule, and who
   or what could rule.
7. **Bug pass**: the `/code-review` result summary, or the unavailable line.

Draft GitHub review text only when the user asks, from the findings above.
The user posts it; `gh pr review` and `gh pr comment` stay unused. To discuss
the diff in an annotated UI instead, use [plannotator-review](../plannotator-review/SKILL.md).

## Sources

- https://google.github.io/eng-practices/review/
- https://conventionalcomments.org/
- https://doc.rust-lang.org/cargo/reference/semver.html
- https://github.com/anthropics/claude-plugins-official
- https://github.com/anthropics/claude-code-security-review
- https://github.com/alibaba/open-code-review
- https://github.com/obra/superpowers
