# Eval harness

Run skill evaluations with the patched `@nano-step/eval-harness` v0.4.2 package.
This directory owns the command, installer, dependencies, patches, shims, and
tests. Skill cases and baselines stay with their skills.

## Install

Install with Node.js, npm, Git, and Bash available. From the repository root:

```sh
sh terminal/bin/eval-harness/install.sh
~/.local/bin/eval-harness --help
```

The root setup installer also runs this installer. Dependencies go into this
directory's ignored `node_modules/`, not the OpenCode config directory. The
installer uses `npm ci` with the committed lockfile, then links
`~/.local/bin/eval-harness` to the runner. The shell configuration already
includes `~/.local/bin` in `PATH`.

Existing setup-owned links at `~/.config/opencode/eval-harness` and
`~/.config/opencode/patch-eval-harness` are retargeted. `XDG_CONFIG_HOME` is
respected. A new installation does not create those links. Other files and links
in that directory are left unchanged.

Installation applies `patches/eval-harness-0.4.2.patch`, then
`patches/eval-harness-gaps.patch`, then `patches/eval-harness-workflows.patch`
to the pinned dependency. The npm postinstall
hook checks the full patch sequence on a temporary copy before changing the
package. It rejects version or source drift and supports repeated installation.
Do not edit the installed package by hand. Run the installer to replace an older
installed patch version.

## Run

Evaluations require OpenCode, its provider authentication, Python 3.9 or later, and the
upstream runner's shell tools, including `jq`, `sha256sum`, and `timeout`.
The runner puts `shims/` on `PATH` only for its child process. Do not
add that directory to your shell's `PATH`.

```sh
eval-harness run --skill=technical-docs --dry-run
eval-harness run --skill=technical-docs
```

Saved state remains under
`${XDG_STATE_HOME:-~/.local/state}/opencode/eval-harness`. No run data is moved.
The default model is `openai/gpt-5.6-sol` unless `EVAL_MODEL`, `EVAL_SMOKE_MODEL`,
or `EVAL_FULL_MODEL` is set.

The wrapper searches both `agents/skills/` and `terminal/opencode/skills/`. An explicit
`OPENCODE_SKILLS_ROOT` replaces this default search. Set
`OPENCODE_SKILLS_EXTRA_ROOT` to add one more directory. Missing skills, cases,
fixtures, model errors, and incomplete or malformed transcripts fail with exit
code 13. These errors are not subject to regression warn-only mode.

### Exit codes and checks

`run`, two-tier runs, and `regrade` return:

| Code | Meaning |
| --- | --- |
| `0` | Checks passed, or an explicit warning/bypass policy allowed the run. |
| `2` | Invalid command arguments. |
| `12` | An assertion failed, whether or not a baseline exists. |
| `13` | Candidate, transcript, or scorer error. |

Set `EVAL_WARN_ONLY=1` only to allow assertion failures to return `0`. Errors
still return `13`. The old `promoted` marker no longer controls this policy.
`promote` explains the policy without changing state. `EVAL_BYPASS=1` remains an
explicit run skip, recorded in history. It does not apply to regrading.

`baseline` and `accept` can record failed assertions when you request them.
They reject runner/scorer errors, including errors in later attempts. A saved
failing baseline does not exempt a case from future failures.

Shell checks require both exit `0` and matching output. The positive integer
`EVAL_CHECK_TIMEOUT_SECONDS` sets their timeout in seconds (default `30`).
Timeouts and missing commands are scorer errors. All checks are collected.

### Fresh repetitions

```sh
eval-harness run --skill=technical-docs --mode=full --repetitions=3
```

Each attempt starts with the original fixtures, including after a successful
attempt. JSON reports contain each attempt's checks and the case success rate.
Markdown reports include later-attempt failures. A case passes only when every
attempt passes. This rate is not a statistical confidence estimate.

`EVAL_REPETITIONS` supplies the default count. Repetitions run sequentially and
support smoke/full mode only. Do not combine them with `--stability-samples`
greater than one. Stability samples remain failure-only retries, but now also
start with original fixtures. Neither mode changes the original attempt's files.

### Reconstructed work tasks

The separate workflow corpus contains six development tasks and two held-out
tasks reconstructed from recorded work. Five tasks have follow-up turns. The
original `run --skill=...` command still selects only that skill's regression
cases. Workflow scores are labeled separately in reports and history.

```sh
eval-harness workflow --dry-run
eval-harness workflow --case=nested-exit --max-seconds=180
eval-harness workflow --split=development --repetitions=2
```

Only development tasks run by default. Held-out tasks require an explicit case
ID or `--split=heldout`. Keep them out of routine model tuning. Use
`--model=provider/model` to override the configured model. Workflow execution
supports smoke/full mode, 1-20 repetitions, and 1-3600 seconds per candidate
attempt. It does not use two-tier mode, failure-only retries, warning mode, or
bypass. Failed automatic checks return `12`; errors return `13`.

Cases with `turns` send each prompt separately through the same native OpenCode
session. Later prompts are not supplied in the first message. A failed turn
stops the attempt, and one timeout covers all its turns. Each repetition gets a
new session and fresh prepared inputs. Multi-turn execution currently requires
host mode; Docker rejects it before setup or model execution. Single-prompt
Docker cases remain supported.

Trusted `setup.script` files prepare disposable repository state once before
the initial snapshot. `EVAL_SETUP_MAX_SECONDS` limits setup to 180 seconds by
default (allowed range 1-3600). Repetitions copy that prepared state; regrading
never runs setup. YAML `budget` fields are descriptive, not enforced limits.
Use the timeout settings above; no token or dollar cap is enforced.

The source-comparison and verification-note tasks require human review of their
prose. Reports and the workflow summary show `PENDING MANUAL REVIEW` even when
all automatic checks pass. Exit `0` establishes only that those checks passed,
not that a human approved the output. Their review criteria accompany the report.

See the [corpus reference](workflows/README.md) for tasks, output contracts, and
checker limits, and [provenance](workflows/provenance.md) for source records.
This is a hand-selected reconstructed sample, not measured workload coverage.
Known-good and broken-reference runs test the checkers, not model quality.

### Docker execution

Host execution remains the default. For Docker execution, provide a running
local Docker daemon and a local image with `/bin/sh`, OpenCode, and the tools
needed by the case. Prefer an image ID or digest for repeatable inputs. The
harness does not pull images or fall back to the host.

```sh
EVAL_RUNNER=docker \
EVAL_DOCKER_IMAGE="$IMAGE_ID" \
OPENCODE_AUTH_FILE="$HOME/.local/share/opencode/auth.json" \
eval-harness run --skill=technical-docs --mode=full
```

Alternatively, `EVAL_DOCKER_AUTH_ENV` lists the space-separated credential
variable names to forward: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`,
`OPENAI_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`. Each named variable must be
set. No other host environment variables are forwarded. Host OpenCode is not
required for Docker execution.

Defaults are one CPU, `1g` memory, 256 processes, and a 256 MiB temporary
filesystem. Set `EVAL_DOCKER_CPUS` and `EVAL_DOCKER_MEMORY` to change CPU and
memory limits. `EVAL_MAX_SECONDS` limits each candidate attempt.

The container uses the caller's numeric user, a read-only root filesystem,
dropped capabilities, and no host sockets. Only temporary copies of case inputs,
selected skills, and explicit authentication are mounted. Skill `evals/`
directories are excluded on both runners. Relative links confined to each input
or output tree are preserved, including dangling links and bounded cycles.
Absolute links, escapes, linked control files, and special files are rejected.
Skill copies still reject links.

Docker shares the host kernel and allows public network access. The candidate
and Docker daemon can access supplied credentials. **Only candidate execution is
containerized:** shell and browser checks still run on the host. Use trusted
cases and artifacts. Host mode is not a security sandbox. No runner can prevent
an agent from writing secrets it can read into its output.

### Regrade saved evidence

```sh
eval-harness regrade --run="$RUN_ID" --case="$CASE_ID"
```

Regrading applies the case's current YAML checks to all saved attempts without
running the candidate again. Deterministic checks require no OpenCode or model
authentication. LLM checks still need their judge credentials and can incur cost.

Each invocation writes a separate directory under the state root's `regrades/`.
It keeps a verified source snapshot, the current case YAML, per-attempt working
copies and checks, and `report.json`. Original run files remain unchanged. The
report identifies the source run and leaves unmeasured cost as `null`.

Workflow regrading finds the current indexed case under `EVAL_WORKFLOWS_ROOT`
(the wrapper defaults to `workflows/` here). It validates saved turn/session
evidence, uses current review metadata, and also writes `report.md`. Original
workflow provenance stays with the source record. Setup is not rerun.

Regrading requires a finished single-tier run created with this version's
evidence checksums. Old runs and two-tier aggregate reports are not eligible.
Use an individual contributing run for two-tier work. Active runs, errors,
missing files, changed evidence, and unsafe paths are rejected. Checksums detect
changed files, not an attacker who can also rewrite the checksum record.

### Prototype browser check

The cancellation prototype case drives visible controls in Chromium. It checks
legal and illegal transitions, refunds, terminal states, reset, and external
resource requests. Its fixture defines the control names and output IDs without
prescribing a layout.

The checker defaults to `/usr/bin/chromium`. Set `EVAL_CHROMIUM_BIN` to another
Chromium executable, including on macOS. A missing browser fails the check as a
scorer error. The checker uses headless Chromium with `--no-sandbox` and a
temporary profile, so use it only with trusted artifacts.

## Cleanup

The runner removes generated sandboxes on exit, including failed runs. Pass
`--debug` to keep a run's sandboxes for inspection. Cleanup is a normal command
and a shared run-exit hook. It does not use `BASH_ENV`. Authentication and
temporary runtime homes are removed even with `--debug`. Docker containers are
removed after success, failure, or timeout during normal runner operation.

To remove retained sandboxes, use the `run_id` printed by the runner:

```sh
eval-harness cleanup --run="$RUN_ID"
eval-harness cleanup --help
```

Cleanup removes only case sandbox directories and stability/repetition sandboxes
from that run. It keeps reports, transcripts, workdirs, fixtures, and other runs.
It refuses active or interrupted runs, unverified completion, path traversal,
and symlink escapes. Older finished runs are accepted when their `results.json`
identifies the requested run. There is no force or clean-all option.

## Measurements

Each case reports `metrics` from OpenCode `step_finish` events: uncached input,
output, reasoning, cache read and cache write tokens, step count, and the elapsed
time between the first start and last finish event. Stability and repetition
attempts are included in case measurements. Two-tier cost totals include smoke
and full runs.
Cache counts are separate from uncached input. Reasoning is not added to output
again. The cost is an OpenCode estimate, not verified billing. Missing
measurements and costs stay `null`, including the run cost when any case has an
unknown cost. Legacy usage records remain readable for old reports and use the
existing pricing-table estimate. `EVAL_PRICING_FILE` can override that table.

`EVAL_MAX_SECONDS` enforces a timeout for each attempt. `EVAL_BUDGET_USD` does not
enforce a dollar cap. Do not use it as a spending limit.

## Test

After installation, run the local tests and the patched dependency's tests:

```sh
npm --prefix terminal/bin/eval-harness test
npm --prefix terminal/bin/eval-harness run test:upstream
```

These tests use temporary files and model stubs. They do not make live model
requests. The local suite requires Chromium. The upstream command runs every
upstream shell test with guards against unintended model/network commands.

`npm test` also runs checker counterexamples, corpus integrity tests, and the
workflow runner with fake candidates. To run only workflow checks:

```sh
npm --prefix terminal/bin/eval-harness run test:workflows
```

The SQL-review and blog-collection regression cases now require structured JSON
records instead of free-form keyword checks. They test bounded decisions and
evidence, not unrestricted prose quality. Simplify checks multiple inputs,
input preservation, and repeated calls. Enpass platform scenarios remain
authored expectations, not executable credential tests.

To include real Docker lifecycle tests with a fake candidate, use a local image
with `/bin/sh` and standard shell tools. No OpenCode installation is needed in
this test image:

```sh
EVAL_TEST_DOCKER_IMAGE="$IMAGE_ID" \
node terminal/bin/eval-harness/tests/execution-docker.cjs
```
