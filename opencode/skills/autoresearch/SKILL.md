---
name: autoresearch
description: Set up and run a bounded, measured experiment loop for an optimization target. Use when asked to start autoresearch, optimize a metric, or run experiments.
---

# Autoresearch

Run measured experiments in bounded parallel batches. Keep improvements, discard failures, and leave a durable record that a fresh agent can resume.

## Setup

1. Ask or infer: **Goal**, **Command**, **Metric** and direction, **Files in scope**, **Constraints**, and **Stop conditions**.
   - A target value is optional.
   - Default limits: 3 parallel experiments per batch, 30 total experiments, 3 consecutive batches without improvement, and 2 hours elapsed time. Stop when the first limit is reached.
   - Lower the parallel count when experiments compete for CPU, memory, ports, external quotas, or shared services. Use sequential runs when isolation cannot prevent interference.
2. Confirm the repository base and inspect `git status`. Do not hide, move, or include unrelated user changes. Create `autoresearch/<goal>-<date>` from the agreed base; use a separate coordinator worktree when the active checkout is dirty or in use by another task.
3. Read the source files. Understand the workload deeply before writing anything.
4. Create `experiments/`, then write `autoresearch.md`, `autoresearch.sh`, and `experiments/worklog.md` (see below). Run the repository's required checks, load the `commit` skill, and commit these setup files.
5. Initialize the experiment, run the baseline at least three times when the benchmark is noisy, log it, then start the first batch.

### `autoresearch.md`

This is the heart of the session. A fresh agent with no context should be able to read this file and run the loop effectively. Invest time making it excellent.

```markdown
# Autoresearch: <goal>

## Objective
<Specific description of what we're optimizing and the workload.>

## Metrics
- **Primary**: <name> (<unit>, lower/higher is better) — the optimization target
- **Secondary**: <name>, <name>, ... — independent tradeoff monitors

## How to Run
`./autoresearch.sh` — outputs `METRIC name=number` lines.

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

Update `autoresearch.md` every 5-10 experiments or after any significant breakthrough — especially the "What's Been Tried" section — so resuming agents have full context.

### `autoresearch.sh`

Bash script (`set -euo pipefail`) that: pre-checks fast (syntax errors in <1s), runs the benchmark, and outputs structured lines to stdout. Keep the script fast — every second is multiplied by hundreds of runs. Update it during the loop as needed.

**For fast, noisy benchmarks** (< 5s), run the workload multiple times inside the script and report the median. This produces stable data points and makes the confidence score reliable from the start. Slow workloads (ML training, large builds) don't need this — single runs are fine.

#### Structured output

- `METRIC name=value` — primary metric (must match the metric being tracked) and any secondary metrics. The agent parses these from stdout.

#### Design the script to inform optimization

The script should output **whatever data helps you make better decisions in the next iteration.** Think about what you'll need to see after each run to know where to focus:

- Phase timings when the workload has distinct stages
- Error counts, failure categories, or test names when checks can fail in different ways
- Memory usage, cache hit rates, or other runtime diagnostics when relevant
- Anything domain-specific that would help localize regressions or identify bottlenecks

### `autoresearch.checks.sh`

Bash script (`set -euo pipefail`) for fast correctness gates such as focused tests, type checks, or output validation. Create it whenever an experiment can improve the metric while breaking required behavior. Omit it only when `autoresearch.sh` already proves correctness or the target cannot affect correctness.

When this file exists:

- Runs automatically after every **passing** benchmark.
- If checks fail, log as `checks_failed` and do not apply the candidate.
- Its execution time does **NOT** affect the primary metric.
- You cannot `keep` a result when checks have failed.

When this file does not exist, document where correctness is checked instead.

**Keep output minimal.** Suppress verbose progress/success output and let only errors through. This keeps context lean and helps the agent pinpoint what broke.

```bash
#!/bin/bash
set -euo pipefail
# Example: run tests and typecheck — suppress success output, only show errors
pnpm test --run --reporter=dot 2>&1 | tail -50
pnpm typecheck 2>&1 | grep -i error || true
```

---

## JSONL State Protocol

All experiment state lives in `autoresearch.jsonl`. This is the source of truth for resuming across sessions.

### Config Header

The first line (and any re-initialization line) is a config header:

```json
{"type":"config","name":"<session name>","metricName":"<primary metric name>","metricUnit":"<unit>","bestDirection":"lower|higher","target":null,"maxExperiments":30,"plateauBatches":3,"timeBudgetMinutes":120,"parallelExperiments":3}
```

Rules:

- First line of the file is always a config header.
- Each subsequent config header (re-init) starts a new **segment**. Segment index increments with each config header.
- The baseline for a segment is the first result line after the config header.

### Result Lines

Each experiment result is appended as a JSON line:

```json
{"run":1,"batch":0,"hypothesis":"baseline","baseCommit":"abc1234","candidateRef":"baseline","commit":"abc1234","metric":42.3,"metrics":{"secondary_metric":123},"status":"keep","files":[],"description":"baseline","timestamp":1234567890,"segment":0}
```

Fields:

- `run`: sequential run number (1-indexed, across all segments)
- `batch`: batch number; baseline is batch 0
- `hypothesis`: short stable identifier for the tested idea
- `baseCommit`: best commit from which the candidate started
- `candidateRef`: SHA-256 of the candidate patch, or `baseline`
- `commit`: best 7-character commit after the decision; retained so existing dashboards continue to work
- `metric`: primary metric value (0 for crashes)
- `metrics`: object of secondary metric values — **once you start tracking a secondary metric, include it in every subsequent result**
- `status`: `keep` | `runner_up` | `discard` | `crash` | `checks_failed`
- `files`: files changed by the candidate, used to decide whether combination testing is safe
- `description`: short description of what this experiment tried
- `timestamp`: Unix epoch seconds
- `segment`: current segment index

### Initialization

To initialize, write the config header through a temporary file and rename it atomically:

```bash
entry='{"type":"config","name":"<name>","metricName":"<metric>","metricUnit":"<unit>","bestDirection":"<lower|higher>","target":null,"maxExperiments":30,"plateauBatches":3,"timeBudgetMinutes":120,"parallelExperiments":3}'
tmp="autoresearch.jsonl.tmp.$$"
printf '%s\n' "$entry" > "$tmp" && mv "$tmp" autoresearch.jsonl
```

To re-initialize, add a new config header through `write_jsonl_entry`:

```bash
write_jsonl_entry '{"type":"config","name":"<name>","metricName":"<metric>","metricUnit":"<unit>","bestDirection":"<lower|higher>","target":null,"maxExperiments":30,"plateauBatches":3,"timeBudgetMinutes":120,"parallelExperiments":3}'
```

---

## Data Integrity Protocol

**CRITICAL: JSONL data must never be corrupted or lost.**

### Pre-Write Validation

Before writing any new experiment result, validate the JSONL file:

```bash
validate_jsonl() {
    local jsonl_file="autoresearch.jsonl"
    if [[ -f "$jsonl_file" ]]; then
        local run_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
        echo "Current runs in JSONL: $run_count" >&2
        tail -n 5 "$jsonl_file" 2>/dev/null | while IFS= read -r line; do
            if ! echo "$line" | python3 -m json.tool >/dev/null 2>&1; then
                echo "WARNING: Invalid JSON found in state file" >&2
                return 1
            fi
        done
        echo "JSONL validation: OK" >&2
        return 0
    fi
    return 0
}
validate_jsonl || echo "WARNING: JSONL validation failed. Proceeding with caution." >&2
```

### Atomic Write Pattern

Never append directly to JSONL. Use atomic write pattern:

```bash
write_jsonl_entry() {
    local entry="$1"
    local jsonl_file="autoresearch.jsonl"
    local temp_file="${jsonl_file}.tmp.$$"
    cat "$jsonl_file" > "$temp_file" 2>/dev/null || touch "$temp_file"
    echo "$entry" >> "$temp_file"
    if ! echo "$entry" | python3 -m json.tool >/dev/null 2>&1; then
        rm -f "$temp_file"
        echo "WARNING: Invalid JSON entry, not writing" >&2
        return 1
    fi
    mv "$temp_file" "$jsonl_file"
    local new_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
    echo "Write verification: $new_count runs in JSONL" >&2
    return 0
}
```

### Post-Write Verification

After every write operation, verify the data was written correctly:

```bash
verify_write() {
    local expected_run=$1
    local jsonl_file="autoresearch.jsonl"
    if [[ -f "$jsonl_file" ]]; then
        local actual_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
        if [[ "$actual_count" -lt "$expected_run" ]]; then
            echo "WARNING: Run count mismatch! Expected $expected_run, got $actual_count" >&2
            return 1
        fi
        echo "Write verification: OK (run $expected_run present)" >&2
        return 0
    fi
    return 1
}
```

### Backups

Before any user-confirmable action (manual intervention, major changes), create a backup:

```bash
cp autoresearch.jsonl "autoresearch.jsonl.backup.$(date +%s)" 2>/dev/null || true
# Keep only last 5 backups
ls -t autoresearch.jsonl.backup.* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
```

---

## Running Experiment Batches

The coordinator owns the main autoresearch branch and every state artifact. Worker agents only edit code in isolated worktrees. They never edit `autoresearch.jsonl`, the dashboard, the worklog, or the experiment definition.

### 1. Plan the batch

Read the current best commit, worklog, ideas backlog, source, and available profiling data. Generate 6-12 distinct hypotheses, then select up to `parallelExperiments` candidates with the best expected information gain.

For each selected hypothesis, record:

- the mechanism it tests
- the expected metric change and why
- the files it may change
- the fast check that rejects a broken implementation

Do not run cosmetic variations of the same idea in one batch. When several candidates need the same file, parallel worktrees still isolate them, but only one candidate can win without a later combination test.

### 2. Create isolated worktrees

Create each candidate from the current best commit in a unique path under `/tmp/autoresearch-<session>/batch-<N>/candidate-<M>`. Use detached worktrees so failed candidates leave no branches:

```bash
git worktree add --detach "<candidate-path>" "<best-commit>"
```

Before creation, verify `/tmp` exists and record every path created by this run. Never reuse a worktree from another batch.

### 3. Implement candidates in parallel

Launch one worker per worktree in one parallel tool call. Give each worker the absolute worktree path, one hypothesis, the files in scope, and the constraints from `autoresearch.md`.

Each worker must:

1. Work only in its assigned worktree.
2. Implement only its assigned hypothesis.
3. Run the fast rejection check.
4. Confirm that only files in scope changed. Stage intent for new files with `git add -N`, then write `git diff --binary HEAD` to a unique patch file outside the worktree under the recorded batch artifact directory.
5. Return the patch path, its SHA-256, and the changed-file list.

Workers do not commit. This keeps throwaway candidates outside the repository's commit gate. They must not run resource-sensitive benchmarks concurrently unless the benchmark is proven independent. They must not choose winners or write shared state.

### 4. Measure candidates

The coordinator measures candidate worktrees one at a time by default. Run measurements concurrently only when they cannot compete for CPU, memory, ports, caches, quotas, or shared services.

In each candidate worktree:

1. Run `./autoresearch.sh` and parse every `METRIC name=value` line.
2. Mark a non-zero exit as `crash`.
3. If the benchmark passes and `autoresearch.checks.sh` exists, run it. Mark a failure as `checks_failed`.
4. Capture secondary metrics and diagnostics.
5. Re-run a possible improvement when it is within 1 MAD of the current best. Use the median result for the decision.

### 5. Select and apply the winner

Compare every valid candidate with the best metric at the start of the batch.

- `keep`: the best candidate that improves the primary metric, passes checks, and does not cause a catastrophic secondary regression
- `runner_up`: another candidate that improves on the batch baseline but loses to the winner
- `discard`: equal to or worse than the batch baseline
- `crash`: benchmark command failed
- `checks_failed`: benchmark passed but correctness checks failed

When a winner exists, apply its patch to the coordinator branch. Run the repository-defined format, lint, build or typecheck, relevant tests, and benchmark. Load the `commit` skill and commit only after every required check passes. The candidate becomes `keep` only after this confirmation. If confirmation fails, reverse only the applied patch, mark the candidate with the observed failure, and treat the batch as having no winner.

Secondary metrics monitor tradeoffs. Reject a primary improvement only for a defined constraint breach or a catastrophic regression, and record the reason.

### 6. Test safe combinations

After confirming the winner, consider runner-ups that changed files disjoint from the winner and from each other. File disjointness permits a combination test; it does not prove compatibility.

For each promising runner-up:

1. Create a fresh detached worktree from the confirmed winner commit.
2. Apply the runner-up patch into that worktree.
3. Run the benchmark and correctness checks.
4. Keep the combination only if it beats the confirmed winner and passes every check.
5. Apply a winning combination patch to the coordinator branch, run the full commit gate, re-measure there, commit through the `commit` skill, and log it as a separate experiment.

Log combinations that regress as evidence. Do not combine candidates with overlapping changed files automatically.

### 7. Log the complete batch

The coordinator writes one JSONL result for every candidate and combination through the atomic write function. Write state before presenting a results table in chat.

After each result:

1. Verify the JSONL write.
2. Regenerate `autoresearch-dashboard.md`.
3. Append a concise entry to `experiments/worklog.md`:

```markdown
### Run N, batch B: <hypothesis> - <primary_metric>=<value> (<STATUS>)
- Timestamp: YYYY-MM-DD HH:MM
- Base: <base commit>
- Candidate: <candidate patch SHA-256>
- Files: <changed files>
- Result: <metric values>, <delta vs batch baseline and best>
- Insight: <why the hypothesis worked or failed>
- Next: <next experiment suggested by this result>
```

Update the `Key Insights` and `Next Ideas` sections when evidence changes them. Once a secondary metric appears, include it in every later result.

### 8. Clean up

After all candidate results and patches are durable, reverse each candidate patch inside its own worktree and confirm `git status --short` is empty. Then remove only the detached worktrees recorded for this batch with `git worktree remove <path>`. If cleanup or removal fails, preserve the worktree and report its path. Do not use `git clean`, force removal, or broad filesystem deletion for cleanup.

On setup, create `experiments/worklog.md` with the session header, data summary, and baseline result. On resume, read the JSONL, worklog, dashboard, experiment definition, and Git log before planning another batch.

---

## Dashboard

After each experiment, regenerate `autoresearch-dashboard.md`:

```markdown
# Autoresearch Dashboard: <name>

**Batches:** 4 | **Runs:** 12 | **Kept:** 3 | **Runner-ups:** 2 | **Discarded:** 5 | **Failed:** 2
**Baseline:** <metric_name>: <value><unit> (#1)
**Best:** <metric_name>: <value><unit> (#8, -26.2%)
**Confidence:** <score>x (see below)
**Stop:** 12/30 experiments | 1/3 plateau batches | 46/120 minutes

| # | batch | hypothesis | candidate ref | <metric_name> | status |
|---|-------|------------|-----------|---------------|--------|
| 1 | 0 | baseline | baseline | 42.3s | keep |
| 2 | 1 | optimize-hot-loop | sha256:12ab... | 40.1s (-5.2%) | keep |
| 3 | 1 | try-vectorization | sha256:34cd... | 43.0s (+1.7%) | discard |
...
```

Include delta percentages versus the session baseline and the relevant batch baseline. Show all runs in the current segment and the current stop-budget counters.

### Data Consistency Check

If the number of runs in `autoresearch.jsonl` doesn't match the number of entries in `experiments/worklog.md`:

1. Back up the current JSONL and worklog before repair.
2. Compare backups, Git history, worktree artifacts, and benchmark output to identify the last consistent run.
3. Reconstruct only entries supported by those artifacts. Never replace a newer state file with an older backup without comparing both.
4. Verify every repaired JSON line and recount both files.
5. If evidence is insufficient, stop new experiments and note the discrepancy in the dashboard header:

```
⚠ DATA INCONSISTENCY DETECTED
- Worklog documents: <WORKLOG_COUNT> experiments
- JSONL contains: <JSONL_COUNT> runs
- Missing: <DIFF> runs
```

---

## Confidence Scoring

After 3+ experiments in a segment, compute a **confidence score** — how the best improvement compares to the session's noise floor. This helps distinguish real gains from benchmark jitter.

**How it works:**

- Use Median Absolute Deviation (MAD) of all metric values in the current segment as a robust noise estimator.
- Confidence = `|best_improvement| / MAD`. A score of 2.0x means the best improvement is twice the noise floor.
- Include in the dashboard after each result.
- **Advisory only** — never auto-discards. Re-run experiments when confidence is low to confirm.

| Confidence | Meaning |
|---|---|
| >= 2.0x | Improvement is likely real |
| 1.0-2.0x | Above noise but marginal |
| < 1.0x | Within noise — re-run to confirm |

---

## Decision and Stop Rules

- **Measure before judging.** Keep a candidate only from recorded metric and check results.
- **Confirm improvements.** Re-run gains within 1 MAD of the best result before applying them.
- **Prefer simple wins.** When two results are equivalent within noise, keep the simpler candidate only if complexity is a declared secondary objective. Otherwise keep the current best.
- **Record evidence.** Describe what the result taught, not only what changed.
- **Change direction after repeated failures.** Re-read source and profiling data when related hypotheses fail. Do not spend another batch on cosmetic variations.
- **Handle crashes cheaply.** Fix a trivial experiment harness error. Log other crashes and continue with a different hypothesis.

Check stop conditions before planning each batch and after logging each batch. Stop when any condition is true:

1. A target is defined and the confirmed best result reaches it.
2. The total experiment limit is reached.
3. The configured number of consecutive full batches produces no confirmed improvement.
4. The time budget is reached. Do not start a batch that cannot reasonably finish within the remaining budget.
5. No untested viable hypothesis remains.
6. The user asks to stop.

A batch with no confirmed winner increments the plateau counter. A confirmed improvement resets it to zero. If a budget expires during a batch, finish active measurements, write all results, clean up recorded worktrees, and stop before planning another batch.

At stop:

1. Run correctness checks and one final benchmark on the best coordinator commit.
2. Verify JSONL and worklog consistency.
3. Regenerate the dashboard with the stop reason.
4. Update `autoresearch.md` and the ideas backlog.
5. Report the baseline, best result, confidence, kept commits, failed constraints, untested ideas, elapsed time, and stop reason.

Do not ask whether to continue before a configured stop condition. The user can start a new segment with a new budget or target.

When resuming, read `autoresearch.jsonl`, `experiments/worklog.md`, `autoresearch-dashboard.md`, `autoresearch.md`, the ideas backlog, and Git log. If JSONL is absent, use the missing-state process below.

---

## Missing State File

If `autoresearch.jsonl` is missing when resuming:

1. **Preserve context from `autoresearch.md`** — read the objective, metrics, and files in scope.
2. **Ask for user confirmation** — "State file missing. Options:
   - A) Create new state (fresh start)
   - B) Continue with autoresearch.md context only
   - C) Restore from backup (if available)"
3. **If fresh start**: initialize new JSONL with config header.
4. **If continuing with context only**: proceed with autoresearch.md data but note the limitation.

---

## Ideas Backlog

When you discover complex but promising optimizations that you won't pursue right now, **append them as bullets to `autoresearch.ideas.md`**. Don't let good ideas get lost.

On resume (context limit, crash), check `autoresearch.ideas.md` — prune stale/tried entries, experiment with the rest. When all paths are exhausted, delete the file and write a final summary.

## User Messages During Experiments

If the user changes direction while a batch is running, finish active measurements and make their results durable before planning another batch. If the user asks to stop, do not start pending candidates; log completed work, clean up, and stop.

## Safety

- Always work on a dedicated `autoresearch/*` branch. Never experiment on main.
- The coordinator is the sole writer of shared experiment state.
- Create every candidate from the recorded best commit in an isolated worktree.
- Keep experiment-state files out of candidate patches and combination patches.
- Update `autoresearch.md` "What's Been Tried" every 5-10 experiments or after breakthroughs.
- Create `autoresearch.checks.sh` whenever the benchmark does not prove required behavior.
- Always use atomic writes for JSONL. Always verify after writing.
- Back up state before user-confirmable actions.
