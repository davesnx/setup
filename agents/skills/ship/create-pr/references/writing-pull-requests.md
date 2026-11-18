# Examples And Media Details

[The main skill](../SKILL.md) owns the workflow and body rules. All examples
below are fictional: commands, output, SHAs, and measurements illustrate the
format and are not evidence from this repository.

## Quick Correction

Title: `Treat equal expiry timestamps as stale`

````markdown
Expire entries at the current timestamp so an expired value cannot survive
another refresh cycle.

**Evidence** (`a1b2c3d`)
```text
$ go test ./cache -run TestExpiryBoundary -v
--- PASS: TestExpiryBoundary/equal_timestamp_is_stale
--- PASS: TestExpiryBoundary/future_timestamp_is_valid
PASS
ok example/cache 0.004s
```

**Risk**: two-way door. Revert restores the old expiry boundary; stored data is unchanged.
````

## Bounded Change In Bullet Style

Title: `Retry transient failures for idempotent storage writes`

````markdown
- Apply the shared retry policy to idempotent storage writes after transient
  503 responses, matching the timeout and backoff of other storage calls.
- Return permanent errors immediately; non-idempotent writes remain unchanged.

**Evidence** (`d4e5f6a`)
```text
$ go test ./storage -run Retry -v
--- PASS: TestRetry/transient_503_retried_three_times
--- PASS: TestRetry/permanent_404_returned_at_once
--- PASS: TestRetry/non_idempotent_write_not_retried
PASS
ok example/storage 0.008s
```

**Risk**: two-way door. Revert restores single attempts; no stored state changes.
````

## Focused Sketches

A call tree can show why plan loading now happens once per request:

```text
handleRequest
  loadPlan
    parsePlan
  runQueries
```

A shape diff can locate a new responsibility without a full file inventory:

```diff
 src/cache/
 ├── expiry.ts
-└── store.ts
+├── store.ts
+└── clock.ts          # injectable clock for boundary tests
```

Other useful views include pseudocode for logic, a component tree for UI state
ownership, and Mermaid for interactions. Show the full shape when most is new
or omitted context would hide order or ownership. Candidate-SHA permalinks can
support a short code excerpt. For diagnostics, pair a source trigger with its
observed output; [user PR #70](my-pull-requests.md) illustrates that shape.

## Visual Comparisons

Use columns **Scenario**, **Before: base branch and SHA**, and **After: head
branch and SHA**. Each row holds the two uploaded captures for one scenario.
Use descriptive image alt text or video labels. Describe viewport, theme, input,
and state beside the table, including indirect changes such as text wrapping.
The main skill defines the upload exception and publication requirements.

## Benchmark Detail

Example comparison for fictional base `main@123abcd` and head `cache@456defa`:

| Metric | Before: main@123abcd | After: cache@456defa | Change |
| --- | --- | --- | --- |
| Mean lookup time | 8.2 ms | 6.1 ms | 2.1 ms lower |

Example method: `bench lookup --entries 10000 --seed 42`, on the same host and
runtime, ten warmup runs and thirty measured runs per ref. The 95% confidence
intervals for the means are 8.0–8.4 ms and 5.9–6.3 ms. This describes the measured
workload, not production tail latency.

Include input size and measurement method. Distinguish mean, median, and
percentiles; explain how uncertainty was estimated. Label a delta's direction
and meaning, and avoid relative percentages when the baseline is zero.

## Migration Risk Example

```markdown
**Risk**: one-way door. Rewriting `sessions.expires_at` destroys the old values; rollback requires restoring the pre-migration backup before reverting.
```

For a complex migration, a useful review note could point first to the reader/
writer compatibility contract, then the migration and recovery checks. A precise
invariant such as “old readers accept new rows during deployment” gives the
reviewer more to check than “backward compatible”.
