# Running Experiment Batches

Read this before planning or running a batch, selecting winners, handling user messages, or stopping. Read [state.md](state.md) before state access and [dashboard.md](dashboard.md) before result reporting. On resume, first follow [recovery.md](recovery.md).

The coordinator owns the main autoresearch branch and every state artifact. Worker agents only edit code in isolated worktrees. They never edit `autoresearch.jsonl`, the dashboard, the worklog, or the experiment definition.

## 1. Plan the batch

Read the current best commit, worklog, ideas backlog, source, and available profiling data. Generate 6-12 distinct hypotheses, then select up to `parallelExperiments` candidates with the best expected information gain.

For each selected hypothesis, record:

- the mechanism it tests
- the expected metric change and why
- the files it may change
- the fast check that rejects a broken implementation

Do not run cosmetic variations of the same idea in one batch. When several candidates need the same file, parallel worktrees still isolate them, but only one candidate can win without a later combination test.

## 2. Create isolated worktrees

Create each candidate from the current best commit in a unique path under `/tmp/autoresearch-<session>/batch-<N>/candidate-<M>`. Use detached worktrees so failed candidates leave no branches:

```bash
git worktree add --detach "<candidate-path>" "<best-commit>"
```

Before creation, verify `/tmp` exists and record every path created by this run. Never reuse a worktree from another batch.

## 3. Implement candidates in parallel

Launch one worker per worktree in one parallel tool call. Give each worker the absolute worktree path, one hypothesis, the files in scope, and the constraints from `autoresearch.md`.

Each worker must:

1. Work only in its assigned worktree.
2. Implement only its assigned hypothesis.
3. Run the fast rejection check.
4. Confirm that only files in scope changed. Stage intent for new files with `git add -N`, then write `git diff --binary HEAD` to a unique patch file outside the worktree under the recorded batch artifact directory.
5. Return the patch path, its SHA-256, and the changed-file list.

Workers do not commit. This keeps throwaway candidates outside the repository's commit gate. They must not run resource-sensitive benchmarks concurrently unless the benchmark is proven independent. They must not choose winners or write shared state.

## 4. Measure candidates

The coordinator measures candidate worktrees one at a time by default. Run measurements concurrently only when they cannot compete for CPU, memory, ports, caches, quotas, or shared services.

In each candidate worktree:

1. Run `./autoresearch.sh` and parse every `METRIC name=value` line.
2. Mark a non-zero exit as `crash`.
3. If the benchmark passes and `autoresearch.checks.sh` exists, run it. Mark a failure as `checks_failed`.
4. Capture secondary metrics and diagnostics.
5. Re-run a possible improvement when it is within 1 MAD of the current best. Use the median result for the decision.

## 5. Select and apply the winner

Compare every valid candidate with the best metric at the start of the batch.

- `keep`: the best candidate that improves the primary metric, passes checks, and does not cause a catastrophic secondary regression
- `runner_up`: another candidate that improves on the batch baseline but loses to the winner
- `discard`: equal to or worse than the batch baseline
- `crash`: benchmark command failed
- `checks_failed`: benchmark passed but correctness checks failed

When a winner exists, apply its patch to the coordinator branch. Run the repository-defined format, lint, build or typecheck, relevant tests, and benchmark. Load `github` Commit mode and commit only after every required check passes, subject to the root permission boundary. The candidate becomes `keep` only after this confirmation. If confirmation fails, reverse only the applied patch, mark the candidate with the observed failure, and treat the batch as having no winner.

Secondary metrics monitor tradeoffs. Reject a primary improvement only for a defined constraint breach or a catastrophic regression, and record the reason.

## 6. Test safe combinations

After confirming the winner, consider runner-ups that changed files disjoint from the winner and from each other. File disjointness permits a combination test; it does not prove compatibility.

For each promising runner-up:

1. Create a fresh detached worktree from the confirmed winner commit.
2. Apply the runner-up patch into that worktree.
3. Run the benchmark and correctness checks.
4. Keep the combination only if it beats the confirmed winner and passes every check.
5. Apply a winning combination patch to the coordinator branch, run the full commit gate, re-measure there, commit through `github` Commit mode, and log it as a separate experiment.

Log combinations that regress as evidence. Do not combine candidates with overlapping changed files automatically.

## 7. Log the complete batch

The coordinator writes one JSONL result for every candidate and combination through the atomic write function. Write state before presenting a results table in chat.

After each result:

1. Verify the JSONL write.
2. Regenerate `autoresearch-dashboard.md` using [dashboard.md](dashboard.md).
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

## 8. Clean up

After all candidate results and patches are durable, reverse each candidate patch inside its own worktree and confirm `git status --short` is empty. Then remove only the detached worktrees recorded for this batch with `git worktree remove <path>`. If cleanup or removal fails, preserve the worktree and report its path. Do not use `git clean`, force removal, or broad filesystem deletion for cleanup.

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
2. Verify JSONL and worklog consistency using [recovery.md](recovery.md) if they disagree.
3. Regenerate the dashboard with the stop reason.
4. Update `autoresearch.md` and the ideas backlog.
5. Report the baseline, best result, confidence, kept commits, failed constraints, untested ideas, elapsed time, and stop reason.

Do not ask whether to continue before a configured stop condition. The user can start a new segment with a new budget or target.

## Ideas Backlog

When you discover complex but promising optimizations that you won't pursue right now, append them as bullets to `autoresearch.ideas.md`.

On resume (context limit, crash), check `autoresearch.ideas.md`: prune stale/tried entries, experiment with the rest. When all paths are exhausted, delete the file and write a final summary.

## User Messages During Experiments

If the user changes direction while a batch is running, finish active measurements and make their results durable before planning another batch. If the user asks to stop, do not start pending candidates; log completed work, clean up, and stop.
