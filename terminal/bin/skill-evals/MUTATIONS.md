# Manual skill deletion experiments

For maintainers deciding which instructions to shorten and which evals need
better coverage. Run on September 16, 2026, with Coder Eval 0.12.1, OpenCode
1.18.31, `openai/gpt-6-astra`, and isolation version 2.

## Changes tested

Two manually selected deletions were applied to private copies of the skills:

| Mutation | Removed | Selected eval |
| --- | --- | --- |
| `code-review`: no review details | Section 3, **Select Review Details**. 14 lines, 782 characters. | `review-sql-pressure` |
| `simplify`: no verification/report | Section 5, **Verify and report**. 20 lines, 879 characters. | `simplify-behavior` |

Skill names, descriptions, and supporting files were retained. The current
`code-review` already loads reference details on demand. This experiment used
that version, not the earlier version requiring all four references.

Each selected eval ran twice with the current skill, twice with the mutation,
and twice with the target absent: **12 attempts total**. Other skills, prompts,
fixtures, checkers, model, and limits were held constant within each experiment.
The two experiments ran concurrently; attempts within each experiment ran
sequentially. No change was applied to either source skill.

## Results

All attempts passed the automatic outcome checks and isolation audits. Current
and mutated targets loaded in 2/2 attempts each. Absent targets loaded in 0/2.
The simplification quality proxy also passed in all six simplification attempts.

These are per-attempt means over two repetitions:

| Eval | Configuration | Outcome passes | Reported tokens | Seconds | Tool calls |
| --- | --- | --- | --- | --- | --- |
| SQL review under pressure | Current | 2/2 | 50,483 | 29.3 | 5 |
| SQL review under pressure | Mutation | 2/2 | 49,740 | 26.9 | 5 |
| SQL review under pressure | Target absent | 2/2 | 23,428 | 21.5 | 3 |
| Behavior-preserving simplification | Current | 2/2 | 59,323.5 | 41.4 | 7 |
| Behavior-preserving simplification | Mutation | 2/2 | 45,979.5 | 34.5 | 5.5 |
| Behavior-preserving simplification | Target absent | 2/2 | 30,058 | 30.8 | 4 |

Reported tokens are Coder Eval's `input_tokens` (including cache traffic) plus
`output_tokens`, summed across the attempt. They measure recorded token volume,
not dollar cost. Cached and uncached tokens have different prices.

Relative to current:

- Removing review details reduced reported tokens by **1.5%**. Mean duration was
  2.4 seconds lower, with no change in tool count or measured outcome.
- Removing verification/reporting reduced reported tokens by **22.5%**. Mean
  duration was 6.9 seconds lower, with fewer tool calls and no outcome-score change.

These timing differences are exploratory. Current simplification durations were
50.6 and 32.2 seconds; mutated durations were 36.7 and 32.2 seconds. Two attempts,
fixed configuration order, shared machine load, and API latency do not establish
a reliable speed improvement.

## Manual trace inspection

### Review details deletion

Both current and mutated runs loaded `code-review`, read the diff, reproduced the
SQL injection using in-memory SQLite, and wrote the required finding. Neither
configuration read the optional reference files on this small diff.

The absent-target runs also reported the injection correctly, but did not run
the SQLite reproduction. The outcome checker scores the finding and its exact
source evidence, not whether the agent reproduces it. Thus the skill changed the
verification process even though its outcome score did not improve.

The deletion survived this eval. That does not establish that the removed
reference-selection instructions are unnecessary on larger reviews.

### Verification/reporting deletion

All six final implementations retained a direct early-return loop, preserved the
public function, and passed the external behavior checks.

Current skill, both attempts:

- Ran an explicit `node --check` followed by seven behavior cases.
- Checked the exported function and input preservation.
- Re-read the final source after writing the summary.
- Included verification results in `cleanup.md`.

Mutated skill, both attempts:

- Still ran six behavior cases and export/input-preservation checks.
- Omitted the separate `node --check` command and final source re-read. Importing
  the module during the behavior test still requires valid JavaScript syntax.
- One attempt recorded verification in `cleanup.md`; the other saved a summary
  without verification results.

The eval did not penalize that reporting difference. It requires a nonempty
summary and correct code, not a summary of the checks performed. The mutation
therefore revealed a coverage gap in the reporting contract, not a demonstrated
correctness regression. The token decrease also reflects fewer agent steps, not
just the 879 removed characters.

## Interpretation

Neither mutation was rejected by its selected outcome eval. Neither improved
the measured outcome either. Both absent-target controls passed, confirming that
these two fixtures do not require the target skills to solve them on this model.

The verification/reporting section is a useful candidate for a **shorter
replacement**, not immediate deletion: the traces show it changes execution and
the information retained in the saved summary. Test a concise replacement on a
real project with required checks and a meaningful report before adopting it.

For review, select a fixture that actually requires reference detail or tracing
across files before judging the value of the selection section.

Keep these results separate from a formal mutation score. Deleting instructions
does not necessarily produce a defective skill; these are component-removal
experiments, and their selected fixtures may be insensitive to the changes.

## Evidence and reproduction

Local evidence directory (ignored by Git):

```text
.runs/manual-mutations-ol7hhod5/
  mutations.json
  no-review-details.diff
  no-verify-report.diff
  no-review-details/code-review/
  no-verify-report/simplify/
  review-run/summary.json
  review-run/summary.md
  simplify-run/summary.json
  simplify-run/summary.md
  inspection.json
```

Each run also contains its configuration and catalog audits, frozen checkers,
skill-bundle hashes, complete transcripts, and candidate output files.
`inspection.json` contains the per-attempt token counts, durations, tool calls,
and source-unchanged checks.

Validated source hashes:

| Skill | Current `SKILL.md` SHA-256 | Mutated `SKILL.md` SHA-256 |
| --- | --- | --- |
| code-review | `38f69c50689dc4240df307cafe4dc3b287646f7d9b0ef2b800c0bbcf40677a3a` | `76ad63d0a44732e3ddb92a6772880027be0f9aa828ac1b9e5916ee190b555a43` |
| simplify | `96c9257c78848ec27ba3bb2692166ab21c72769d8b8b138efc955d80b3560214` | `6d09e8544eebbc4f3d5dcc146d589e49b01832f26edb03ed3801524f055f07ae` |

The control bundle hashes matched the pre-mutation records. All non-target
bundles matched across current, absent, and candidate configurations. Both source
`SKILL.md` files still matched their starting hashes after execution.

Commands run from this directory:

```sh
uv run python pilot.py run --skill code-review --case review-sql-pressure \
  --candidate .runs/manual-mutations-ol7hhod5/no-review-details/code-review \
  --repeats 2 --timeout 120 \
  --run-dir .runs/manual-mutations-ol7hhod5/review-run

uv run python pilot.py run --skill simplify --case simplify-behavior \
  --candidate .runs/manual-mutations-ol7hhod5/no-verify-report/simplify \
  --repeats 2 --timeout 120 \
  --run-dir .runs/manual-mutations-ol7hhod5/simplify-run
```

Choose fresh run directories when repeating. The candidate copies are local
evidence; on another checkout, reconstruct the deletions from the named sections
and verify the source hashes before treating the runs as repetitions.
