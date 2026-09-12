# Reconstructed work-task evals

For harness maintainers: this reference describes the offline corpus and its
grading limits. It contains eight reconstructed, hand-selected tasks. This is
a convenience sample, not a frequency-weighted representative dataset or an
exact replay of sampled conversations. See [provenance.md](provenance.md) for
the exact local records, sections, sanitized summaries, and reconstruction gaps.

## Run offline checks

Use Node.js 22 or later, Bash, POSIX shell tools, and Git. The parent harness
already supplies the `yaml` parser. No other dependency is needed.

```sh
node terminal/bin/eval-harness/workflows/test.cjs
```

The test reads each case with the installed YAML parser, copies only mapped
files into a fresh temporary directory, runs trusted setup, overlays reference
outputs, and executes the actual shell checks from the YAML. It then repeats
with believable broken outputs and missing output files. Exit status and output
must both match. It checks manifest counts, split labels, distinct prompts,
path confinement, no linked input files, repeatable setup, and partial setup
recovery. It also checks JSON, JavaScript and shell syntax, ASCII text, and
trailing whitespace. It does not run a model or test the separate workflow runner.

The trusted guarded-install setup constructs a disposable Git repository with
committed, staged, and working versions of one file. It uses command-local fake
identity, an empty Git template, no remote, and no global Git configuration.
Only this trusted setup writes Git state. Candidates are not asked to commit.
Tests use a fresh HOME and do not pass credentials to child commands.

## Test the runner

```sh
node terminal/bin/eval-harness/workflows/test-runner.cjs
EVAL_TEST_PACKAGE=/path/to/patched/package node terminal/bin/eval-harness/workflows/test-runner.cjs
```

The installed package is the default. It must already have the workflow patch
and the parent harness's command-line prerequisites. This test does not install
or patch a package. It runs the real corpus through
the runner with a fake OpenCode candidate that has explicit test-only access
to reference files. It checks the default six-task development selection,
explicit two-task heldout selection, separate session turns, fresh repetitions,
real checker failures returning 12, and regrading without changing saved source
attempts. Failed runs retain temporary evidence and print its path. These are
runner integration checks, not model-quality measurements.

Verified with the installed patched package: both reference selections returned
0, all eight broken references returned 12, and two-attempt regrades passed for
verification-note and path-migration. Manual-review status stayed pending in
results. The parent harness's full local suite and all 21 upstream suites passed.

## Verification record

Local offline verification after the JSON fixture change: all eight reference
outputs passed. All 55 broken or missing outputs failed across 63 actual YAML
check executions.
Five tasks have two turns. Repeated setup and recovery checks passed. The test
also passed JavaScript/shell syntax, JSON parsing, and whitespace checks.
ShellCheck passed on all twelve shell files with these commands:

```sh
shellcheck -x -P SCRIPTDIR -s sh \
  terminal/bin/eval-harness/workflows/tasks/*/fixtures/*.sh \
  terminal/bin/eval-harness/workflows/references/nested-exit/*.sh \
  terminal/bin/eval-harness/workflows/references/guarded-install/*.sh
shellcheck terminal/bin/eval-harness/workflows/tasks/*/setup.sh \
  terminal/bin/eval-harness/workflows/references/path-migration/prepare.sh
```

These are checker integrity results, not model scores. No paid or free model
attempts were made for this corpus. The runner integration result is recorded
above. Wrapper dispatch and patch installation have separate harness tests.

## Tasks and split

| Task | Split | Turns | Main outcome |
| --- | --- | --- | --- |
| nested-exit | development | 2 | Failed command status reaches the outer installer; recovery works. |
| guarded-install | development | 1 | Refuse user files; repair stale links; keep staged and working content. |
| agent-recovery | development | 2 | Keep a responsive shared socket; recover from a stalled agent. |
| source-comparison | development | 1 | Correct structured facts and real source quotes despite conflicting docs. |
| verification-note | development | 2 | Distinguish metadata validation, blocked runtime checks, and untested examples. |
| review-permissions | development | 2 | Enforce all restriction layers at read time without disclosure or parent changes. |
| path-migration | heldout | 2 | Apply a changed destination to active JSON state and the managed link while preserving unrelated settings and history. |
| pinned-children | heldout | 1 | Honor the pinned release and preserve explicit children through the caller. |

The split was chosen before any model runs. The workflow runner must exclude
heldout tasks by default and require explicit selection for them. Running this
offline test includes heldout known-good fixtures solely to check validators.
Do not call this a heldout model score or use it to tune a model.

## Input and grader boundary

`index.json` follows schema version 1. Each task has one schema-version-2 YAML
case in `tasks/<id>/cases/`. Each case uses either `prompt` or `turns`, not both.
Turns are separate messages in one session, not concatenated text. The runner
must keep later turns hidden until it sends them and restart from prepared
inputs for each repetition. Failed turns stop the attempt.

`setup.fixtures` maps destination filenames to sources relative to the task.
`setup.script`, when present, runs with Bash in the fresh workdir before the
candidate and initial snapshot. It remains outside candidate inputs.
Preserve the prepared `.git` directory and relative fixture symlinks in input
snapshots, repetitions, and regrade copies. Do not rerun setup during regrading.
`EVAL_FIXTURE_DIR` is the absolute task `fixtures/` directory. Checks call
`$EVAL_FIXTURE_DIR/../check.cjs`, which uses the shared `check-lib.cjs` outside
the candidate directory. Do not copy task directories wholesale. Do not copy
`references/`, `provenance.md`, checks, or `bad.json` into a candidate workdir.

`references/<id>/` contains complete changed-file overlays. Files not present
there stay as prepared inputs. `prepare.sh` applies a reference solution when
the task requires final filesystem state. `bad.json` defines post-reference
restores, replacements, writes, or removals. It is test data, not candidate
content. Existing skill copies must still exclude their eval directories.

The two prose tasks have `manual_review: true` in `tasks/<id>/metadata.json`,
outside their candidate inputs. This advisory metadata is not an automated
semantic grade. The index uses only the five task fields in the shared schema.
No runner schema extension is required.

## Grader limits

Automated grades establish the named executable and structured outcomes, not
general engineering quality. Reference passes and rejected mutations validate
the checkers only. No skill effectiveness or model-quality claim is made.

- source-comparison requires human review of comparison.md for accurate reasoning,
  useful tradeoffs, relevant citations, and clear treatment of the doc conflict.
  The checker verifies four facts and exact relevant source lines. It cannot
  establish the quality of the prose or every claim made in it.
- verification-note requires human review of note.md for unsupported verification
  claims, correct scope, and consistency with checks.json. The checker rejects
  false claims in the structured record, but cannot certify arbitrary prose.
- Code tasks exercise selected public paths and preservation constraints. A
  passing candidate test command does not by itself prove good regression-test
  design, maintainability, or complete edge-case coverage.
- Socket tests use real disposable Unix sockets and a fake probe protocol.
  They test selection, bounded waiting, and sequential recovery, not the SSH
  wire protocol, keys, cross-login races, or real service deployment.
- Permission tests use local IO and a delayed review promise. They check actual
  attempted reads, refusal, no approval calls, and parent-history preservation,
  not host SDK behavior or a model-generated review.
- pinned-children uses executable JavaScript reductions of recorded compiler
  behavior. It does not build OCaml or establish compatibility with every mlx
release. path-migration covers explicit local state, not live editor services.
- Checkers execute candidate code on the host. Use trusted cases and artifacts.
  Multi-turn candidates also run in host mode, not an OS security sandbox. Path
  checks prevent accidental fixture escapes, not access by a hostile model.
- test-runner.cjs checks real-corpus selection, skill-copy isolation, session
  turns, repetitions, and regrading with fake candidates. General timeout and
  malformed-session handling belong to the separate runner unit tests. Neither
  test measures model quality.
