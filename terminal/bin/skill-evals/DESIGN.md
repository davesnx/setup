# Skill evaluation pilot: design and findings

For maintainers deciding whether Coder Eval should replace the current runner.

## Decision

Use native Coder Eval tasks for a bounded pilot. Keep the existing runner and
its corpus unchanged. Reuse four existing input fixtures rather than create
another set of example code. The pilot's output contracts and checkers are
explicitly scoped adaptations, not a claim of full legacy-checker parity.

| Source | Adopted design |
| --- | --- |
| [Addy Osmani](https://github.com/addyosmani/agent-skills/tree/main/evals) | Separate structural, routing, and behavioral checks. Description overlap is advisory. |
| [Superpowers](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) | Start from failures, test under pressure, and test the checkers with wrong outputs. |
| [Coder Eval](https://github.com/UiPath/coder_eval/tree/v0.12.1) | Run real agents with native tasks, configuration comparisons, repeated attempts, and recorded evidence. |

`pilot.py` snapshots skill bundles, fixtures, and checkers, then prepares
native experiment files. Coder Eval owns candidate execution and grading.
`isolate.py` limits host-configuration contamination. `report.py` keeps outcomes,
activation, advisory quality checks, and execution problems separate.

Python is used for this integration because it validates task data against the
pinned Coder Eval models directly. The existing JavaScript fixtures and checks
continue to run with Node.js.

## Evaluation boundaries

The pilot answers: does making the target skill available improve these tasks
when neighboring skills remain available? It does not force the agent to load
the target and does not compare against a model with all skills disabled.

The catalog contains `code-review`, `simplify`, `code-standards`, and `unslop`.
OpenCode 1.18.31 also supplies `customize-opencode`; its presence is recorded and
held constant. The catalog preflight rejects any other unexpected skill.

The behavioral suite has four base cases and two pressure variations:

| Case | Required result | Limit |
| --- | --- | --- |
| review-sql | Block the injection with the correct location and source/sink evidence. | Structured review, not unrestricted prose quality. |
| review-clean | Approve a complete private rename with no findings. | One negative-control diff. |
| simplify-behavior | Preserve numeric results, ordering, and unmodified inputs. | Tests selected values, not all JavaScript behavior. |
| simplify-readonly | Preserve source and identify the abstraction and trim operation. | Text anchors require human review of the recommendation. |
| review-sql-pressure | Same result despite urgency and a claimed senior approval. | Synthetic pressure, not an observed production conversation. |
| simplify-readonly-pressure | Same read-only result despite an obvious one-line fix. | Synthetic pressure, not an observed production conversation. |

The simplification shape check is advisory. It detects retained trusted-path
checks and catches some ineffective cleanups; shorter text is not proof of
maintainability. Review changed code before accepting a skill revision.

## Preliminary run on September 16, 2026

Runtime: Coder Eval **0.12.1**, OpenCode **1.18.31**, model
**openai/gpt-6-astra**. Dependencies are recorded in `uv.lock`.

Commands run from this directory:

```sh
uv run python pilot.py run --suite behavior --repeats 2 --timeout 120
uv run python pilot.py run --suite routing --repeats 1 --timeout 90
```

Recorded evidence, relative to this directory (ignored local state):

- Behavioral run: `.runs/run-3_9_hjmw/summary.md` and `summary.json`.
- Routing run: `.runs/run-tftg5bxz/summary.md` and `summary.json`.
- Each run includes its manifest, skill hashes, frozen graders, catalog audit,
  generated task/configuration files, and detailed Coder Eval reports.

Results:

- **24/24 behavioral attempts passed automatic outcome checks.** Both current
  and absent-target configurations passed every case twice. Every measured
  outcome delta was **0 percentage points**.
- **12/12 routing requests matched their required/allowed skill sets.** There
  were eight positive requests and four no-skill requests. This is one attempt
  per prompt, not evidence of reliable routing across the full catalog.
- The current `simplify` skill did not activate in either read-only pressure
  attempt, although both outputs passed the automatic outcome checks. This is
  a diagnostic signal, not an outcome failure. Other skills remained available.
- All 36 completed attempts passed catalog preflight. The absent-target runs
  did not activate their absent target.
- Prose quality and human preference remain **unscored**. Inspect the eight
  read-only review outputs before claiming qualitative success.

These runs used the first isolation protocol, which checked the skill catalog
but not effective instructions. They are preliminary integration evidence, not
accepted comparisons under the final protocol described below. The original
scores remain recorded; no contamination was established or ruled out by that
first protocol.

An earlier integration smoke exposed two issues before model execution:
OpenCode's built-in skill was missing from the expected catalog, and its large
debug payload could be truncated through a pipe. The launcher now includes the
built-in and reads the debug output through a temporary regular file. That
failed run remains recorded as invalid under `.runs/run-mjcaj5ie/`.

## Final isolation and reporting checks

A read-only review found two additional sources of possible contamination:
configuration-bearing login records and system-managed OpenCode configuration.
Isolation version 2 copies only the selected provider's API/OAuth entry, rejects
managed configuration, and checks effective instruction, agent, plugin, MCP,
provider, and reference settings before a task starts. It does not bypass an
administrator's managed settings.

The review also found that checker exceptions could be counted as model failures,
and that the native engagement criterion could disagree with the successful-call
routing rule. Checker errors now invalidate comparisons. Native routing criteria
are informational; the pilot summary supplies the routing gate. Regression tests
cover both reporting cases and configuration/authentication filtering.

On the final code, these live checks passed:

```sh
uv run python pilot.py run --case review-clean --repeats 2 --timeout 120
uv run python pilot.py run --suite routing --case route-negative-json --repeats 2 --timeout 90
```

- `.runs/run-xurk36gz/summary.md`: **4/4** paired review attempts passed.
  Both configurations passed twice. Only current runs loaded `code-review`.
- `.runs/run-vbikbm6l/summary.md`: **2/2** no-skill routing attempts passed.
- All six passed the catalog and effective-configuration audits.
- **14 offline tests passed**, including wrong outputs, candidate bundle
  preparation, inherited settings, authentication filtering, checker exceptions,
  routing labels, and missing evidence.

Later version-2 runs include [manual mutation tests](MUTATIONS.md) and a
[48-attempt commit comparison](COMMIT-a3863a3.md) covering all six behavioral cases
and 12 routing prompts at exact Git revisions. Keep those revision-specific
results separate from the earlier working-tree runs. Do not combine the two
isolation protocols into one score.

## Interpretation

The final smoke tests demonstrate working execution, preserved repetitions,
configuration/catalog control, and separate activation/outcome scoring. The
preliminary larger run suggests these fixtures are saturated on this model with
this supporting catalog. Neither run shows that the target skills add value,
nor that the skills are unnecessary on harder work.

The next evaluation work should add failures from actual review and cleanup
sessions, plus unseen variations. Do not optimize the skills against these
already-passing cases. Keep them as regression checks.

## Conditions before replacing the existing runner

- Confirm multi-turn session behavior and input isolation.
- Match existing checker and manual-review semantics.
- Validate Docker execution and credential handling for OpenCode.
- Preserve saved-evidence regrading or explicitly decide to retire it.
- Review transport retry behavior and accurate cost/limit handling.
- Evaluate a larger, realistic catalog before using routing numbers as a gate.

Until these are verified, Coder Eval remains a pilot rather than the default.
