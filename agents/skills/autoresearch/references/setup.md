# Setup

Read this before starting a session or changing its definition, benchmark, or correctness checks.

1. Ask or infer: **Goal**, **Command**, **Metric** and direction, **Files in scope**, **Constraints**, and **Stop conditions**. A target value is optional.
2. Set limits. Defaults: 3 parallel experiments per batch, 30 total experiments, 3 consecutive batches without improvement, and 2 hours elapsed time. Stop when the first limit is reached. Lower the parallel count when experiments compete for CPU, memory, ports, external quotas, or shared services. Use sequential runs when isolation cannot prevent interference.
3. Confirm the repository base and inspect `git status`. Do not hide, move, or include unrelated user changes. Create `autoresearch/<goal>-<date>` from the agreed base; use a separate coordinator worktree when the active checkout is dirty or in use by another task.
4. Read the source files. Understand the workload deeply before writing anything.
5. Create `experiments/`, then write `autoresearch.md`, `autoresearch.sh`, and `experiments/worklog.md` (templates below and in [execution.md](execution.md)). Create the worklog with the session header, data summary, and baseline result. Run the repository's required checks, load `github` Commit mode, and commit these setup files, subject to the root permission boundary.
6. Initialize the experiment using [state.md](state.md), run the baseline at least three times when the benchmark is noisy, log it, then start the first batch using [execution.md](execution.md).

## `autoresearch.md`

A fresh agent with no context should be able to read this file and run the loop effectively.

```markdown
# Autoresearch: <goal>

## Objective
<Specific description of what we're optimizing and the workload.>

## Metrics
- **Primary**: <name> (<unit>, lower/higher is better) - the optimization target
- **Secondary**: <name>, <name>, ... - independent tradeoff monitors

## How to Run
`./autoresearch.sh` - outputs `METRIC name=number` lines.

## Files in Scope
<Every file the agent may modify, with a brief note on what it does.>

## Off Limits
<What must NOT be touched.>

## Constraints
<Hard rules: tests must pass, no new deps, etc.>

## Stop Conditions
- Target: <optional target value>
- Maximum experiments: <count>
- Plateau: <consecutive batches without improvement>
- Time budget: <duration>
- Parallel experiments: <count>

## What's Been Tried
<Update this section as experiments accumulate. Note key wins, dead ends,
and architectural insights so the agent doesn't repeat failed approaches.>
```

Update `autoresearch.md` every 5-10 experiments or after any significant breakthrough, especially the "What's Been Tried" section, so resuming agents have full context.

## `autoresearch.sh`

Bash script (`set -euo pipefail`) that: pre-checks fast (syntax errors in <1s), runs the benchmark, and outputs structured lines to stdout. Keep the script fast: every second is multiplied by hundreds of runs. Update it during the loop as needed.

**For fast, noisy benchmarks** (< 5s), run the workload multiple times inside the script and report the median. This produces stable data points and makes the confidence score reliable from the start. Slow workloads (ML training, large builds) don't need this: single runs are fine.

### Structured output

- `METRIC name=value` - primary metric (must match the metric being tracked) and any secondary metrics. The agent parses these from stdout.

### Design the script to inform optimization

The script should output data that helps you make better decisions in the next iteration:

- Phase timings when the workload has distinct stages
- Error counts, failure categories, or test names when checks can fail in different ways
- Memory usage, cache hit rates, or other runtime diagnostics when relevant
- Anything domain-specific that would help localize regressions or identify bottlenecks

## `autoresearch.checks.sh`

Bash script (`set -euo pipefail`) for fast correctness gates such as focused tests, type checks, or output validation. Create it whenever an experiment can improve the metric while breaking required behavior. Omit it only when `autoresearch.sh` already proves correctness or the target cannot affect correctness.

When this file exists:

- Runs automatically after every **passing** benchmark.
- If checks fail, log as `checks_failed` and do not apply the candidate.
- Its execution time does **NOT** affect the primary metric.
- You cannot `keep` a result when checks have failed.

When this file does not exist, document where correctness is checked instead.

Use a concise reporter where available, but preserve diagnostics and each command's exit status. A failing command must fail the gate even if its output has no `error` text. Run checks directly; do not filter output to decide success or suppress failure with `|| true`.

```bash
#!/bin/bash
set -euo pipefail
pnpm test --run --reporter=dot
pnpm typecheck
```
