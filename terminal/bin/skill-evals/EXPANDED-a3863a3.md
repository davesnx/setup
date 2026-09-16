# Expanded on/off study: a3863a3

This study tests a broader skill catalog and six additional skill groups against
[a3863a3](https://github.com/davesnx/setup/commit/a3863a324c86fa6ea4eccad07aa0be479f3383cd).
It extends the [four-skill pilot](COMMIT-a3863a3.md).

## Setup and coverage

- Off: `38f9dad6cb680c33e1ded0044f484d9adf81464a`.
- On: `a3863a324c86fa6ea4eccad07aa0be479f3383cd`.
- Model: `openai/gpt-6-astra`. OpenCode 1.18.31, Coder Eval 0.12.1, isolation v2.
- Date: September 16, 2026.
- Full catalog: **57 repository skills per revision**, plus one built-in skill.
- Behavioral coverage: **12 cases across eight skills**, twice per revision.
- Routing coverage: **24 prompts**, once per revision. Nine skills have positive
  routing examples; all catalog skills can be detected as unwanted activations.
- No live browser, CI-provider, or other external integration coverage.

The six additions are code-standards, comment-purge, tdd, blog-post, post-draft,
and to-spec. Their existing cases and fixtures were imported from the on revision
and applied equally to both revisions. These are development/regression cases
selected for the commit, not a blind held-out benchmark.

Discovery reads tracked `SKILL.md` files at each Git revision. Duplicate names
and invalid metadata fail preparation. The full catalog changes together, so
the comparison measures interactions as well as each target's instructions.
Other commit changes, such as the legacy harness, remain outside the experiment.

## Results

The initial study made 96 attempts. A focused blog diagnostic added four, and a
paired rerun after clarifying the blog output destination added four: **104
attempts total**. Original evidence and failed attempts remain recorded.

### Amended behavioral view

This view uses 44 unchanged attempts from the initial behavioral run plus four
clarified blog attempts. It is an explicitly amended view, not a new complete
batch. The prompt clarification and unchanged grader are described below.

| Measure | Off | On |
| --- | --- | --- |
| Behavioral outcome passes | 23/24 | 24/24 |
| Routing passes | 24/24 | 24/24 |
| Mean behavioral reported tokens | 91,973 | 75,966 |
| Mean behavioral duration | 38.0 s | 33.0 s |
| Mean behavioral tool calls | 6.83 | 4.79 |
| Mean routing reported tokens | 43,087 | 39,879 |
| Mean routing duration | 17.2 s | 19.1 s |

On used **17.4% fewer reported tokens** for the amended behavioral view and
**7.4% fewer** for routing. Mean behavioral duration was 13.1% lower, while mean
routing duration was 11.5% higher. Timing is variable; this is not a uniform
speed improvement.

Tokens include input cache traffic plus reported output tokens. They are not
dollar savings. OpenCode's CLI does not provide complete nested-agent attribution,
and the harness lacks a built-in price entry for this model.

### Per-skill behavioral outcomes

| Skill | Case coverage | Off | On |
| --- | --- | --- | --- |
| code-review | Clean rename, SQL injection, pressure variation | 6/6 | 6/6 |
| simplify | Behavior preservation, read-only, pressure variation | 6/6 | 6/6 |
| code-standards | Preventive safeguards, error model, domain wrappers | 2/2 | 2/2 |
| comment-purge | Preserve an unresolved warning and legal notice | 1/2 | 2/2 |
| tdd | Respect an agreed interface and record the TDD sequence | 2/2 | 2/2 |
| blog-post | Review a complete post without interview or source edits | 2/2* | 2/2* |
| post-draft | Use author evidence while preserving unresolved facts | 2/2 | 2/2 |
| to-spec | Draft from agreed facts without invented scope or publication | 2/2 | 2/2 |

*Clarified output-destination rerun. The original blog case scored 0/2 on each side.*

TDD and several other new cases test decisions or structured output. They do not
prove that the agent executes a complete TDD development cycle or a publication
workflow correctly.

## What the failures revealed

### A real warning-preservation failure

One off-version comment-purge attempt deleted the warning that trimming must
remain before lowercasing until the legacy importer contract is confirmed. It
kept executable code and the legal notice unchanged, but moved the unresolved
constraint into `cleanup.md` instead of preserving the source warning.

The report acknowledged the deletion and that the contract was unavailable.
This is not a grader interpretation of a reworded comment: the warning was gone.
Both on-version attempts retained it. This aligns with the commit's change to
preserve warnings when their constraints cannot be verified or disproved.

It is one observed failure across two attempts per revision. It supports the
change on this case, but is too small a sample for a reliable failure-rate estimate.

### The blog test confused response format with file format

The imported prompt said to put findings in `review.md`, then to "return JSON."
The grader parsed `review.md` as JSON. All four initial attempts wrote Markdown
reviews to the file and returned JSON in their final replies. Calling that an
unambiguous skill-format failure would be misleading.

A focused diagnostic used blog-post with its declared supporting skills rather
than the full catalog. All four attempts produced the same file/reply distinction,
so the symptom did not require the full catalog.

The case registry now appends this requirement equally for off and on:

> Write that JSON object into review.md itself, with no Markdown headings or code
> fences. Returning JSON only in the chat reply does not satisfy the file-output
> requirement.

The grader and fixture were unchanged. Both revisions then passed 2/2. The initial
raw behavioral score remains **21/24 off, 22/24 on**; the amended score is **23/24
off, 24/24 on**. No failed run was overwritten or retried until it happened to pass.

## Manual inspection and grader limits

- The post-draft outputs on both revisions preserved the author's offline/train
  motivation, left the cold-start measurement unresolved, and preserved the
  unrelated maintenance note. The external 12 ms result was not presented as the
  author's measurement in the inspected prose.
- The clarified blog outputs contained relevant observations about the missing
  comparison, ambiguous cache state, and missing takeaway. They did not require an
  interview or edit the source post.
- A sampled to-spec output retained CSV scope, the existing interface, unresolved
  retention, and draft status. It did not adopt PDF export as an agreed feature.

These are assistant inspections, not blind human preference scores. Formal human
review remains pending for writing quality.

Counterexample tests show that the blog grader accepts a nonempty but irrelevant
finding. The post-draft grader can miss an unsupported prose claim if the agent
omits the corresponding claim record. The report keeps these limits visible;
passing their structured checks is not a complete semantic grade.

## Efficiency and routing observations

`code-standards` loaded in 13 off-version behavioral attempts versus two on-version
attempts. On loaded it for the two explicit standards cases. This is consistent
with replacing automatic standards passes with relevant use.

All 24 routing requests matched their required/allowed skill sets on both sides,
including ordinary-edit negatives. Supporting skills are optional where labeled;
their removal can reduce work without changing the routing score.

The efficiency effect is uneven. The amended blog case used more reported tokens
on, as did post-draft. The larger aggregate reduction comes mainly from review
and read-only simplification cases. Do not extrapolate the earlier small-pilot
29% token reduction to the whole catalog.

## Limits and next coverage gaps

- **49 of the 57 repository skills have no behavioral case in this study.**
  Presence in the routing catalog is not proof that their workflows work.
- Only nine skills have positive routing examples. Several new positives name
  the skill directly; implicit selection needs broader coverage.
- This compares the whole changed catalog, not isolated contributions from each
  edited skill. Focused profiles can support later diagnosis.
- Two behavioral repetitions and one routing repetition are small samples.
  Concurrent runs, cache behavior, and API latency limit timing conclusions.
- Fourteen advisory link warnings were recorded: example paths and references
  to repository documentation outside the copied skill packages. They were not
  silently repaired or omitted. None comes from the six imported target skills.
- The six imported cases are single-request tasks. Multi-turn, browser, and
  external integration support still need separate work.

## Evidence and commands

Run from `terminal/bin/skill-evals/`:

```sh
uv run python commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd --expanded --profile full \
  --suite behavior --repeats 2 --timeout 180 --max-parallel 2

uv run python commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd --expanded --profile full \
  --suite routing --repeats 1 --timeout 180 --max-parallel 2
```

These commands describe the recorded study. Subsequent [contract fixes](MIGRATION.md)
added cited findings and complete paragraph records to the canonical cases. The
runner now snapshots working-tree eval definitions by default. A new run therefore
uses stricter checks; it must not be treated as a repetition of the same grader
version. The recorded native task files and snapshots retain the original study.

Local evidence directories, ignored by Git:

| Run | Directory |
| --- | --- |
| Original full-catalog behavior | `.runs/commit-22p5tip1/` |
| Full-catalog routing | `.runs/commit-t6vaxoqy/` |
| Focused blog diagnostic, original prompt | `.runs/commit-e7jn8kj2/` |
| Clarified blog paired rerun, full catalog | `.runs/commit-tv9_hckj/` |

Each contains `manifest.json`, `coverage.json`, frozen graders and fixtures,
source snapshots, catalog/config audits, task records, and summaries. Combined
statistics and the explicit amended view are in
`.runs/commit-22p5tip1/inspection.json`.

Inspection verified exact Git blobs, identical full-catalog bundles across runs,
paired prompts, and an unchanged grader for the clarification. There were no
missing attempts, transport retries, or execution errors in these runs. Initial
behavior and the focused diagnostic correctly returned a failing exit status;
routing and the clarified blog run passed.
