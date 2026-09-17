# Dashboard

Read this when a requested report or a growing campaign benefits from an
overview. Use the JSONL as its source. For conflicting records, follow
[recovery.md](recovery.md); a shorter worklog is expected.

Generate `autoresearch-dashboard.md` on request or when the overview helps
decisions. Refresh it at handoff if it exists; it need not update after every
experiment:

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

## Confidence Scoring

After 3+ experiments in a segment, compute a **confidence score**: how the best improvement compares to the session's noise floor. This helps distinguish real gains from benchmark jitter.

**How it works:**

- Use Median Absolute Deviation (MAD) of all metric values in the current segment as a robust noise estimator.
- Confidence = `|best_improvement| / MAD`. A score of 2.0x means the best improvement is twice the noise floor.
- Include when generating the dashboard.
- **Advisory only**: never auto-discards. Re-run experiments when confidence is low to confirm.

| Confidence | Meaning |
|---|---|
| >= 2.0x | Improvement is likely real |
| 1.0-2.0x | Above noise but marginal |
| < 1.0x | Within noise - re-run to confirm |
