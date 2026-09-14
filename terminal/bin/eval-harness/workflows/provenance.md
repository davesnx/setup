# Provenance

These are reconstructed, hand-selected work tasks, not sampled exact chats.
This convenience sample is not a frequency-weighted representative dataset.
The split was fixed before any model runs. No model runs informed these tasks.
Only the records listed below and the current task request were read. No raw
transcript database, credentials, private configuration, or remote service was
used. Candidate fixtures are small synthetic reductions, not source archives.
Names and filesystem roots in them are fictional. This file is not a fixture.

## nested-exit

Source: this session's eval-harness comparison and integration, recorded in
`.workplace/plans/eval-harness-openeval_PLAN.md`, Intended end state and
Verification results. The original shell scorer discarded failing exit codes;
integration also found a hook discarding the candidate's exit status.
Sanitized summary: a successful-looking message can mask a failed command, and
the failure must reach the outer caller. This is not an exact conversation
replay. The three-level shell call chain and status 23 are reconstructed inputs.

## guarded-install

Source: `.workplace/plans/tighten-layout_PLAN.md`, Conventions; Decisions D3
and D12; Phase 3 checks; Execution notes, Concurrent work.
Sanitized excerpt: "a regular file or directory there stops the installer with
73, an old link is replaced, nothing is moved"; "second run creates no backup".
The miniature repository has one file with different committed, staged, and
working contents. The installer owns only its managed link, not that file.

## agent-recovery

Source: `.workplace/plans/ssh-agent-small-fix_PLAN.md`, Objective; Scope and
decisions; Checks; Session references.
Sanitized excerpt: "Check whether an agent responds, rather than checking file
type alone"; "Keep a responsive shared agent"; "Resolve incoming socket links".
The probe uses disposable Unix sockets with a one-byte protocol, not SSH keys
or the SSH wire protocol. Exit 1 represents a responsive empty agent, as in
ssh-add. Recovery needs another selection call, not a daemon.

## source-comparison

Source: `.workplace/docs/dotly-study.md`, section 1, Script library and
Symlinks and restoration; section 2, Installers; section 4, Not worth taking.
Sanitized summary: the framework script wins over a user's same-named script;
restoration runs on each install; forced links can overwrite without backup.
The conflicting README is a deliberately constructed misleading source, not a
quotation attributed to the project. JavaScript snapshots model the recorded
decisions. Human review must assess the written comparison and citation meaning.

## verification-note

Source: `.workplace/docs/reason-to-mlx-pr.md`, Body and Checks (lines 5-18).
Sanitized excerpt: "without moving the CLI"; "quick_validate.py passes on the
skill; the two code blocks are copied from the cleanup skill's own example".
The note task uses a fictional converter and a local documentation validator.
It does not include private repository contents. The unavailable compiler,
premature draft claim, and follow-up are reconstructed to expose the boundary
between documentation checks and runtime verification, not recorded test results.

## review-permissions

Source: `.workplace/plans/auto-improve-background_PLAN.md`, Decisions; Checks;
Merge with main (2026-09-08), config hook and live agent-reference paragraph.
Sanitized excerpt: "Preserve global, source-agent, and source-session denials;
treat asks as denies"; "no content disclosure, and no approval requests".
The local IO object replaces host sessions and model calls. It records reads,
approval requests, parent history, and background completion independently.

## path-migration

Source: `.workplace/plans/port-setup_PLAN.md`, Scope; Validation; Current
location (2026-09-06).
Sanitized summary: active setup paths first used a repo/ wrapper; the current
location later removed that wrapper. Existing session records were not rewritten.
The two requested destinations, fixture home, and archived project are fictional.
The follow-up changes the destination within a single candidate session. It
does not replay a recorded two-message conversation.
The current fixture redesign uses independently specified synthetic startup.json
data: {"setupRoot":"old-setup","editor":"fixture-editor"}. It is a new JSON
configuration model, not a copy or conversion of protected configuration.
The migration changes setupRoot and preserves editor. This fixture design comes
from the current task request, not the source record above.

## pinned-children

Source: `.workplace/docs/mlx-research.md`, Syntax, Passing children through
explicitly; Gotchas, local fork; Probe results (mlx-pp 0.11), children row.
Sanitized summary: release 0.11 produced duplicate children labels when explicit
and nested children were combined; the local fork at 5262570 kept the explicit
prop. A project must check its pin before relying on the fork's behavior.
The fixture models label lists in JavaScript instead of installing OCaml. The
requested adapter policy makes explicit children win without changing the pin.
It tests this bounded integration decision, not a real mlx compiler build.
