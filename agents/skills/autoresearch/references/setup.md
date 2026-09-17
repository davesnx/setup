# Resumable Campaign Setup

Use this workflow when persistence across sessions or coordinated candidate
isolation is needed. A bounded single-session loop can follow the main skill
without creating campaign files. On an existing campaign, keep its recorded
configuration unless the user changes it.

1. Ask or infer: **Goal**, **Command**, **Metric** and direction, **Files in scope**, **Constraints**, and **Stop conditions**. A target value is optional.
2. Set limits. Defaults: 1 experiment per batch, 30 total experiments, 3 consecutive batches without improvement, and 2 hours elapsed time. Stop when the first limit is reached. Increase concurrency only when independent candidates justify it or the user requests it. Prevent competition for CPU, memory, ports, external quotas, or shared services during measurements.
3. Confirm the repository base and inspect `git status`. Do not hide, move, or include unrelated user changes. Create `autoresearch/<goal>-<date>` from the agreed base; use a separate coordinator worktree when the active checkout is dirty or in use by another task.
4. Read the source files. Understand the workload deeply before writing anything.
5. Write `autoresearch.md` with the exact benchmark and correctness commands, their working directory, and required support files. Reuse existing commands; add wrappers only when needed. Candidate worktrees contain the recorded best commit, not uncommitted coordinator files. Use support already in that commit, or keep new benchmark/check scripts and fixtures in an immutable run-owned directory outside candidate worktrees. Record its absolute paths and hashes, and run that support against each candidate's source from its working directory. Verify this before the baseline; do not accidentally benchmark the coordinator's code. Keep support outside candidate patches. A setup commit is optional and requires authorization and repository checks. Keep `autoresearch.jsonl` as the authoritative result record; create a worklog only for explanations beyond result descriptions.
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
- Benchmark: <exact command, parsing rule, and working directory>
- Correctness: <exact command and working directory, or how the benchmark proves behavior>
- Support: <paths and hashes of external scripts/fixtures, or their committed revision>

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

Update `autoresearch.md` when the definition or important conclusions change and
before handoff. Summarize findings rather than duplicating JSONL results.

## Optional `autoresearch.sh`

Use a Bash wrapper (`set -euo pipefail`) when the existing benchmark needs fast
pre-checks or structured output. Record its actual invocation and location in the
campaign definition; do not assume it exists inside candidate worktrees. External
support must resolve the code under test from the candidate working directory,
not from the support script's directory. Keep measurement support fixed within a
comparison. A changed workload or check definition requires a new segment and
fresh baseline.

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

Use a Bash wrapper (`set -euo pipefail`) when it helps combine correctness gates
such as focused tests, type checks, or output validation. Existing commands can
be recorded directly instead. An independent correctness gate is required when
the benchmark could improve while breaking behavior. Omit that gate only when
the benchmark proves correctness or the target cannot affect it.

For the recorded correctness gate, whether a wrapper or an existing command:

- Runs automatically after every **passing** benchmark.
- If checks fail, log as `checks_failed` and do not apply the candidate.
- Its execution time does **NOT** affect the primary metric.
- You cannot `keep` a result when checks have failed.

Document where correctness is checked in `autoresearch.md`. File presence alone
does not select or disable the gate.

Use a concise reporter where available, but preserve diagnostics and each command's exit status. A failing command must fail the gate even if its output has no `error` text. Run checks directly; do not filter output to decide success or suppress failure with `|| true`.

```bash
#!/bin/bash
set -euo pipefail
pnpm test --run --reporter=dot
pnpm typecheck
```
