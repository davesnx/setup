# Resume and Recovery

Read this before resuming after a context limit or crash, or when state is missing or inconsistent. Read [state.md](state.md) before accessing JSONL or making a backup.

When resuming, read `autoresearch.jsonl`, `experiments/worklog.md`, `autoresearch-dashboard.md`, `autoresearch.md`, `autoresearch.ideas.md`, and Git log before planning another batch. Prune stale/tried backlog entries. If JSONL is absent, use the missing-state process below. Resume through [execution.md](execution.md) with the recorded best commit and remaining stop budgets.

## Data Consistency Check

If the number of runs in `autoresearch.jsonl` doesn't match the number of entries in `experiments/worklog.md`:

1. Back up the current JSONL and worklog before repair.
2. Compare backups, Git history, worktree artifacts, and benchmark output to identify the last consistent run.
3. Reconstruct only entries supported by those artifacts. Never replace a newer state file with an older backup without comparing both.
4. Verify every repaired JSON line and recount both files.
5. If evidence is insufficient, stop new experiments and note the discrepancy in the dashboard header:

```text
DATA INCONSISTENCY DETECTED
- Worklog documents: <WORKLOG_COUNT> experiments
- JSONL contains: <JSONL_COUNT> runs
- Missing: <DIFF> runs
```

## Missing State File

If `autoresearch.jsonl` is missing when resuming:

1. Preserve context from `autoresearch.md`: read the objective, metrics, and files in scope.
2. Ask for user confirmation: "State file missing. Options: A) Create new state (fresh start); B) Continue with autoresearch.md context only; C) Restore from backup (if available)."
3. If fresh start: initialize new JSONL with config header.
4. If continuing with context only: proceed with `autoresearch.md` data but note the limitation.

For backup restoration, compare available evidence and verify the restored records as in the consistency check above.
