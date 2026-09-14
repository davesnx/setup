# Evaluation

Use this path for output tests, benchmarks, or version comparisons. Description
trigger tests are separate: [Description tuning](description-tuning.md).
The bundled `scripts.run_eval` and `scripts.run_loop` use Claude, not arbitrary
Astra model IDs. For OpenCode's own real model, use its existing eval-harness;
see [Packaging and hosts](packaging-and-hosts.md#opencode).

## Prepare cases and baseline

Start with 2-3 realistic prompts and expand after the first review. Reuse
approved cases; ask for review only when expected behavior is unclear. Include
each supported branch, boundary cases, and relevant failures.

Save cases to `evals/evals.json` within the target skill. Read
[Schemas](schemas.md#evalsjson) before writing them. The case field is
`expectations`; the per-eval metadata field is `assertions`. Pass those strings
as `expectations` to the grader. Do not rename output contract fields.

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": [],
      "expectations": []
    }
  ]
}
```

Keep results in `<skill-name>-workspace/`, beside the skill unless repository
rules set another location. Preserve old results. Create directories as needed:

```text
iteration-1/
  eval-1/
    eval_metadata.json
    with_skill/
      run-1/
        outputs/
        transcript.md
        grading.json
        timing.json
    without_skill/
      run-1/
        outputs/
```

- New skill: compare `with_skill` against `without_skill` (no skill loaded).
- Existing skill: snapshot the complete old skill before editing into a separate
  `skill-snapshot/` directory. Compare `with_skill` against `old_skill`, pointing
  the baseline runner at that snapshot. Preserve its relative resources.
- Existing `new_skill` / `old_skill` results are also supported. Keep configuration
  names stable, with the candidate before its baseline. Use two configurations
  per comparison so the aggregate delta has a clear meaning.

Record the baseline version, host, model, permissions, inputs, and run settings.
Hold these fixed across each pair except for the skill change. For later
iterations, state whether the baseline is the original or previous version.

Create `eval_metadata.json` for each case in each iteration. Keep numeric IDs
stable and names descriptive. Refresh the prompt and assertions if they change:

```json
{
  "eval_id": 1,
  "eval_name": "descriptive-name",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

## Execute and record

Use independent runs for candidate and baseline. Launch paired runs together
when the host supports parallel agents and resources allow it. Sequential fresh
runs are acceptable; do not reuse a candidate's state or answers in its baseline.
For hosts without independent runs, follow the limited-check path in
[Packaging and hosts](packaging-and-hosts.md#claudeai-or-no-independent-runs).

Supply each executor with this contract:

```text
Execute this task:
- Skill path: <candidate or snapshot path; omit for without_skill>
- Task: <eval prompt>
- Input files: <paths, or none>
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/<configuration>/run-<R>/outputs/
- Outputs to save: <the files the user needs>
- Save transcript beside outputs/ as transcript.md.
- Use only the allowed tools and disposable inputs. No Git writes or publishing.
```

While runs execute, draft or review objective assertions. Give them descriptive
text and explain what they check. Update case `expectations` and metadata
`assertions` together before grading. Do not tune assertions to favor an output.
Keep subjective quality judgments in human review rather than forced pass/fail
checks. Use repeat runs (`run-2/`, etc.) when measuring variability.

Capture host-reported `total_tokens` and `duration_ms` as each run finishes, if
available. Some hosts expose these only in completion notifications. Save them
to `timing.json` beside `outputs/`; derive `total_duration_seconds` from measured
milliseconds. See [Timing schema](schemas.md#timingjson). Record missing data as
unavailable, not zero. Character counts are not token measurements.

## Grade and aggregate

1. Read [Grader](../agents/grader.md), then grade each transcript and its actual
   outputs. Use repeatable checks where possible. Save `grading.json` beside
   `outputs/`. Its `expectations` entries require `text`, `passed`, and `evidence`.
2. Run the aggregator from the skill-creator directory:

```bash
python3 -B -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
```

It produces `benchmark.json` and `benchmark.md`. Check every expected run is
included and the candidate precedes its baseline. Inspect missing-metric
handling: any generated zero or character-count fallback is not a measurement.
Do not report time/token gains from incomplete data. Replace placeholder model
metadata with the actual recorded IDs. Read [Benchmark schema](schemas.md#benchmarkjson)
if assembling results manually; keep `configuration` and nested `result` fields.

Read [Analyzing Benchmark Results](../agents/analyzer.md#analyzing-benchmark-results)
to review assertions that do not distinguish configurations, high variance,
failures, and time/token tradeoffs. Report sample size and mean/stddev only for
observed values. A single run does not establish stability or general quality.

## Human review

Use the existing viewer, not custom HTML. Run from the skill-creator directory:

```bash
python3 -B eval-viewer/generate_review.py <workspace>/iteration-N \
  --skill-name <name> --benchmark <workspace>/iteration-N/benchmark.json
```

Start it in the background if the host supports that, retain its process ID,
and stop only that process after review. For iteration 2+, add
`--previous-workspace <workspace>/iteration-<N-1>`. With no display, use
`--static <output-path>` and provide the generated file. If neither is possible,
show the prompts and outputs in chat and record the review limitation.

The Outputs tab shows the prompt, rendered files, grades, and feedback. Later
iterations also show previous outputs and feedback. The Benchmark tab shows
comparison statistics and notes. Navigation uses buttons or arrow keys.
Generate the review before revising based on the results.

After the user submits reviews, read `feedback.json` in the iteration directory.
Static viewers download it; obtain access if required and place the downloaded
file in that iteration's workspace. Its structure is:

```json
{
  "reviews": [
    {"run_id": "eval-1-with_skill-run-1", "feedback": "Missing axis labels", "timestamp": "..."}
  ],
  "status": "complete"
}
```

Use actual `run_id` values from the viewer, including run suffixes when present.
An empty comment records no specific complaint, not proof of correctness or
approval. Do not claim user review when the file is missing or incomplete.

## Improve and repeat

Read transcripts as well as outputs. Fix the general cause of a failure, not
just the test wording. Remove instructions that caused unnecessary work, explain
non-obvious constraints, and reuse helpers when runs show a repeated need.
Preserve permissions and exact output contracts.

Run the full relevant set, including baselines, in a new iteration directory.
Review it with the previous workspace attached. Stop when the user is satisfied,
the agreed criteria pass, or further changes show no useful progress. Report
remaining failures rather than silently treating them as success.

## Optional blind comparison

For a stricter A/B review, read [Comparator](../agents/comparator.md). Give an
independent reviewer two outputs without version identities. Keep the mapping
outside its prompt. Then use [Analyzer](../agents/analyzer.md) with skills and
transcripts to explain the result. Use [Schemas](schemas.md#comparisonjson) for
comparison and analysis artifacts. Skip blind comparison if independent review
is unavailable; do not describe self-review as blind evidence.
