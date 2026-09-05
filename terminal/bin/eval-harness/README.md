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
installer links `~/.local/bin/eval-harness` to the runner. The shell configuration
already includes `~/.local/bin` in `PATH`.

Existing setup-owned links at `~/.config/opencode/eval-harness` and
`~/.config/opencode/patch-eval-harness` are retargeted. `XDG_CONFIG_HOME` is
respected. A new installation does not create those links. Other files and links
in that directory are left unchanged.

Installation applies `patches/eval-harness-0.4.2.patch` to the pinned dependency.
The npm postinstall hook checks the version and patch state, and stops on drift.
It is safe to run the hook again. Do not edit the installed package by hand.

## Run

Evaluations require OpenCode, its provider authentication, Python 3, and the
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

The wrapper searches both `skills/` and `terminal/opencode/skills/`. An explicit
`OPENCODE_SKILLS_ROOT` replaces this default search. Set
`OPENCODE_SKILLS_EXTRA_ROOT` to add one more directory. Missing skills, cases,
fixtures, model errors, and incomplete or malformed transcripts fail with exit
code 13. These errors are not subject to regression warn-only mode.

## Cleanup

The runner removes generated sandboxes on exit, including failed runs. Pass
`--debug` to keep a run's sandboxes for inspection. Cleanup is a normal command
and a shared run-exit hook. It does not use `BASH_ENV`.

To remove retained sandboxes, use the `run_id` printed by the runner:

```sh
eval-harness cleanup --run="$RUN_ID"
eval-harness cleanup --help
```

Cleanup removes only case sandbox directories and stability-sample sandboxes
from that run. It keeps reports, transcripts, workdirs, fixtures, and other runs.
It refuses active or interrupted runs, unverified completion, path traversal,
and symlink escapes. Older finished runs are accepted when their `results.json`
identifies the requested run. There is no force or clean-all option.

## Measurements

Each case reports `metrics` from OpenCode `step_finish` events: uncached input,
output, reasoning, cache read and cache write tokens, step count, and the elapsed
time between the first start and last finish event. Stability attempts are
included in case measurements. Two-tier cost totals include smoke and full runs.
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
requests.
