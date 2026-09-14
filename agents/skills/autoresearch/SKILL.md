---
name: autoresearch
description: Run bounded, measured experiments when the user explicitly requests autoresearch or optimization of a metric.
disable-model-invocation: true
argument-hint: "<metric or target> [constraints]"
---

# Autoresearch

Run measured experiments in bounded parallel batches. Keep improvements, discard failures, and leave a durable record that a fresh agent can resume.

## Route the Work

Read the reference for the current step before acting. Do not load every reference at once.

1. **New session or changed benchmark/checks:** read [setup](references/setup.md). Define the goal, command, metric and direction, scope, constraints, and stop conditions before running experiments.
2. **Resume, missing state, or inconsistent records:** read [recovery](references/recovery.md). Restore context and resolve missing-state choices or unsupported records before starting new work.
3. **Initialize, read, or write state:** read [state](references/state.md). Preserve the JSONL schema, segment rules, atomic writes, verification, and backups.
4. **Plan, run, select, combine, clean up, or stop:** read [execution](references/execution.md). Complete the batch and stop procedures, including final checks and the report.
5. **Report results or assess noise:** read [dashboard](references/dashboard.md). Regenerate the dashboard after every result; confidence is advisory only.

## Boundaries

- Default limits: 3 parallel experiments per batch, 30 total experiments, 3 consecutive batches without improvement, and 2 hours elapsed. Stop at the first limit. Use lower concurrency or sequential runs when resources interfere.
- Work on a dedicated `autoresearch/*` branch, never main. Create each candidate from the recorded best commit in an isolated worktree. Preserve unrelated user changes.
- The coordinator alone writes shared state and selects winners. Workers edit only their assigned candidate scope and do not commit. Keep experiment-state files out of candidate and combination patches.
- Keep a result only after measured improvement and passing correctness checks. Create `autoresearch.checks.sh` whenever the benchmark does not prove required behavior; document any other correctness check. Full repository checks and coordinator remeasurement precede a kept commit.
- Write JSONL atomically and verify each write. Back up state before user-confirmable actions. Update `autoresearch.md` every 5-10 experiments or after breakthroughs.
- Follow user and repository permissions for Git writes, installs, external actions, and publication. This skill does not grant permission. If a required action is not authorized, stop at that boundary and ask rather than bypass it.
- On a stop request, start no pending candidates. Make completed results durable, clean up only recorded worktrees, and report. On changed direction, finish active measurements and save results before replanning.

## Skill Checks

Run `python3 -B agents/skills/autoresearch/tests/test_examples.py` from the repository root to test the documented check gate, reference links, and shell syntax without running real experiments.
