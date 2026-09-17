# Resume and Recovery

Read this before resuming after a context limit or crash, or when state is missing or inconsistent. Read [state.md](state.md) before accessing JSONL or making a backup.

When resuming a campaign, read `autoresearch.jsonl`, `autoresearch.md`, and Git
log. Consult the worklog, dashboard, or ideas backlog when present. The JSONL is
authoritative; derived views can be absent or stale. Prune stale/tried backlog
entries. If JSONL is absent, use the missing-state process below. Resume through
[execution.md](execution.md) with the recorded best commit and remaining budgets.

## Data Consistency Check

Different numbers of JSONL results and worklog entries are expected: the worklog
contains selected explanations. When a recorded metric, candidate, check, or
decision conflicts with its source evidence:

1. Back up the current JSONL and any affected worklog before repair.
2. Compare backups, Git history, worktree artifacts, and benchmark output to identify the last consistent run.
3. Reconstruct only entries supported by those artifacts. Never replace a newer state file with an older backup without comparing both.
4. Verify every repaired JSON line and its supporting evidence. Refresh affected derived views if they exist.
5. If evidence is insufficient, stop new experiments and report the conflicting records and missing evidence. Do not create a dashboard merely to report a conflict.

## Missing State File

If `autoresearch.jsonl` is missing when resuming:

1. Preserve context from `autoresearch.md`: read the objective, metrics, and files in scope.
2. Ask for user confirmation: "State file missing. Options: A) Create new state (fresh start); B) Continue with autoresearch.md context only; C) Restore from backup (if available)."
3. If fresh start: initialize new JSONL with config header.
4. If continuing with context only: proceed with `autoresearch.md` data but note the limitation.

For backup restoration, compare available evidence and verify the restored records as in the consistency check above.
