# Commit a3863a3: on/off evaluation

For maintainers assessing the effect of
[Shorten skill triggers, split large roots, and fix unsafe rules](https://github.com/davesnx/setup/commit/a3863a324c86fa6ea4eccad07aa0be479f3383cd)
on the existing skill-evaluation pilot.

## Comparison

- **Off:** parent `38f9dad6cb680c33e1ded0044f484d9adf81464a`.
- **On:** commit `a3863a324c86fa6ea4eccad07aa0be479f3383cd`.
- Model: `openai/gpt-6-astra`.
- Runtime: OpenCode 1.18.31, Coder Eval 0.12.1, isolation version 2.
- Date: September 16, 2026.

Each side used Git snapshots of the same four catalog entries: `code-review`,
`simplify`, `code-standards`, and `unslop`. The first three change in this commit;
`unslop` does not. OpenCode's built-in `customize-opencode` remained constant.

This measures the combined skill changes in that catalog. It does not measure
the commit's other skills or its changes to the legacy eval harness. The pilot's
prompts, fixtures, labels, checkers, and runtime were held fixed across revisions.
In particular, the commit's changed eval definitions were not applied to only
the on side.

## Results

**All 48 attempts passed their scored checks.** All catalog and effective-config
audits passed, with no missing attempts or execution errors.

| Suite | Off | On | Repetitions |
| --- | --- | --- | --- |
| Behavioral outcomes | 12/12 | 12/12 | Six cases, twice per revision |
| Routing expectations | 12/12 | 12/12 | Twelve prompts, once per revision |

Per-attempt means:

| Suite / metric | Off | On | Reduction |
| --- | --- | --- | --- |
| Behavior: reported tokens | 70,960 | 50,378 | 29.0% |
| Behavior: duration | 32.8 s | 26.0 s | 20.7% |
| Behavior: tool calls | 9.67 | 5.17 | 46.6% |
| Routing: reported tokens | 29,317 | 23,617 | 19.4% |
| Routing: duration | 14.7 s | 14.2 s | 3.1% |
| Routing: tool calls | 3.67 | 2.42 | 34.1% |

Reported tokens are Coder Eval's input tokens, including cache traffic, plus
output tokens. They are not billed-token equivalents or dollar savings.

### Behavioral cases

Every cell below represents two successful attempts. Mean token counts are
rounded to the nearest whole token.

| Case | Off tokens | On tokens | Reduction | Off seconds | On seconds |
| --- | --- | --- | --- | --- | --- |
| Clean rename review | 57,287 | 39,729 | 30.7% | 23.8 | 21.1 |
| SQL injection review | 71,906 | 49,754 | 30.8% | 29.1 | 22.2 |
| SQL review under pressure | 66,867 | 50,103 | 25.1% | 31.5 | 25.4 |
| Behavior-preserving simplification | 60,444 | 55,045 | 8.9% | 36.2 | 30.5 |
| Read-only simplification | 81,492 | 57,868 | 29.0% | 40.3 | 28.4 |
| Read-only simplification under pressure | 87,762 | 49,768 | 43.3% | 35.9 | 28.4 |

### Routing

Both revisions selected the expected required/allowed sets for all 12 prompts:
three review positives, three simplification positives, two prose positives,
and four no-skill requests. No required-skill misses or forbidden-skill
activations were observed in this routing set.

Optional supporting skills are excluded from the precision/recall calculation.
`code-standards` loaded in five off-version routing attempts and zero on-version
attempts. Those off activations were allowed by the labels, so reducing them did
not change the routing score.

## Trace and artifact inspection

The execution records show fewer reference and supporting-skill loads:

- `code-standards` loaded in **12/12 behavioral attempts off** and **0/12 on**.
- Clean-rename reviews used nine tool calls off versus four on. The off traces
  read all four review references and loaded shared standards for this small diff.
- On the read-only pressure case, the off revision loaded `code-review`,
  `simplify`, and `code-standards` in both attempts. The on revision loaded only
  `code-review`. Source preservation and required report checks still passed.

This last case is a change in workflow, not a scored routing failure: its prompt
requests a complexity review without explicitly requiring the Simplify skill.
The behavioral activation indicator is separate from outcome success. Explicit
Simplify requests in the routing suite still loaded Simplify on both revisions.

Spot inspection of the preserved artifacts found the same direct-loop
simplification on both sides. Both sampled read-only pressure reports described
removing `NameFormatter` in favor of `value.trim()`, with source evidence and
verification notes. The on report was shorter, without the off report's fixed
Standards, Spec, Blast Radius, Cleared, and Summary sections.

The prose tasks still require human judgment for overall usefulness. Their
automated checks establish source preservation and selected content anchors,
not complete semantic quality. No blind preference score was collected.

## Interpretation

For this pilot, the commit reduces recorded work while preserving the measured
outcomes and routing behavior. That supports the narrower descriptions and
on-demand reference loading on these small tasks. It does not establish that
the commit improves correctness or that every change in the commit is safe.

The outcome tests remain saturated: both revisions pass every case. They do not
exercise the changed safeguard policy on a difficult boundary, the large-skill
splits, browser workflows, writing workflows, or a full installed skill catalog.

Two behavioral repetitions and one routing repetition per revision are small
samples. Off/on ordering, concurrent suite execution, shared machine load, cache
behavior, and API latency limit timing conclusions. The reported duration
reductions are observations, not guaranteed speed improvements.

## Reproduction and evidence

From `terminal/bin/skill-evals/`:

```sh
uv run python commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd \
  --suite behavior --repeats 2 --timeout 180

uv run python commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd \
  --suite routing --repeats 1 --timeout 180
```

Both revisions received the same 180-second agent-turn limit, 240-second task
limit, 20-step ceiling, and 250,000-token ceiling. The larger token ceiling than
the ordinary pilot allows the longer pre-commit instructions to finish. Neither
side hit a limit.

Local evidence, ignored by Git:

- Behavior: `.runs/commit-10bu4q9b/summary.md` and `summary.json`.
- Routing: `.runs/commit-t6988u3m/summary.md` and `summary.json`.
- Detailed statistics and selected artifact/trace content:
  `.runs/commit-10bu4q9b/inspection.json`.
- Each run includes its exact revisions, Git source snapshots, skill hashes,
  frozen grader files, generated tasks, per-attempt audits, and Coder Eval records.

The inspection script checked every archived file against its Git blob ID,
matched skill bundles across the behavioral and routing suites, and verified
identical graders and paired prompts. Rebuilding both summaries returned exit 0.

The implementation adds `commit_eval.py` and named-catalog support to the pilot.
Regression tests cover simultaneous target/support changes, off/on delta direction,
and separate routing statistics per revision. Sixteen offline tests passed before
the live run. No installed skill or working-tree source was replaced by a snapshot.
