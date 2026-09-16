# Evaluate agent skills

Run a layered skill-evaluation pilot with Coder Eval 0.12.1 and OpenCode.
This tool does not replace or modify the [existing eval harness](../eval-harness/README.md).
See [runner ownership and retirement](MIGRATION.md) before removing either runner or its data.

The pilot uses Addy Osmani's separation of structural, routing, and behavioral
checks, and Superpowers' failure-first scenarios. Coder Eval runs the agents,
repetitions, checks, and comparison experiments. See [design and findings](DESIGN.md).

## Install and check

You need `uv`, Python 3.13 or later, Node.js 22 or later, and OpenCode.
The live integration was checked with OpenCode 1.18.31. Run these commands from
the setup repository root:

```sh
uv sync --project terminal/bin/skill-evals --locked
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/pilot.py check
uv run --directory terminal/bin/skill-evals python -m unittest -v
```

The checks validate four selected skills and 18 tasks, including pressure
variations. Unit tests exercise good and broken outputs without model calls.
Dependencies stay in this directory's ignored `.venv/`. Nothing is installed
into global agent configuration.

## Inspect a run before execution

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/pilot.py plan \
  --case review-clean --repeats 1
```

This writes native Coder Eval task and experiment YAML to a new `.runs/`
directory and validates it without model calls. Coder Eval's generic plan
command can warn about an absent Anthropic key even when the selected agent
is OpenCode. The pilot's live calls use OpenCode's provider authentication.

## Run a comparison

Start with one case:

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/pilot.py run \
  --case review-clean --repeats 1 --timeout 120
```

The default model is `openai/gpt-6-astra`. Select another installed provider/model
with `--model`. The launcher uses supported provider API-key environment
variables or a temporary copy of OpenCode's existing `auth.json`.
Custom host provider configuration and host plugins are not loaded.

Run all six behavioral cases, including two pressure variations:

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/pilot.py run \
  --suite behavior --repeats 2 --timeout 120
```

This requests **24 model attempts**: six cases, two configurations, two repetitions.
The configurations differ only in whether the target skill is present. Other
skills remain available in both. This is not a comparison against a bare model.
Prompts are identical across configurations and do not force skill invocation.

Run the 12 labeled routing prompts:

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/pilot.py run \
  --suite routing --repeats 1 --timeout 90
```

Routing runs continue to completion, without an early-success cutoff. Labels
distinguish required skills, optional supporting skills, and forbidden skills.
The pilot uses four selected skills plus OpenCode's built-in
`customize-opencode`. It does not measure the full installed catalog.

To compare a proposed skill revision, add `--skill simplify --candidate /path/to/simplify`
to a behavioral run. The replacement directory must contain a `SKILL.md` with
the same name. This adds a third configuration without editing the installed skill.
Candidate preparation has offline coverage. Two live deletion comparisons are
recorded in [manual mutation results](MUTATIONS.md).

## Compare a commit with its parent

Use `commit_eval.py` to compare all four pilot skill directories at once. **Off**
is the commit's parent and **on** is the commit itself. Both revisions must exist
in the local Git repository. The commit must have exactly one parent.

From the setup repository root:

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd \
  --suite behavior --repeats 2 --timeout 180

uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd \
  --suite routing --repeats 1 --timeout 180
```

Replace `run` with `plan` for a dry run. `--case` selects one case, and
`--run-dir` selects a fresh evidence directory. The default model and timeout
are `openai/gpt-6-astra` and 180 seconds. The token ceiling is 250,000 per attempt
on both sides, allowing longer pre-commit instructions to finish.

The tool exports source snapshots with `git archive`; it does not check out or
revert your working tree. It holds the current pilot's tasks, fixtures, checkers,
and runtime fixed. It evaluates only the selected catalog, not the entire commit
or its changes to another runner. Routing statistics are stored separately under
`routing_by_variant`. A pooled routing score is not produced for multiple variants.

See [the a3863a3 comparison](COMMIT-a3863a3.md) for the 48-attempt result and limits.

## Run the expanded study

Add `--expanded` to discover repository skill packages at both Git revisions and
import the six cases listed in `expanded_cases.json`. By default the imported
cases and fixtures are snapshotted from the working tree and held fixed for
both skill revisions. This includes uncommitted evaluator edits without changing
the skills being compared. `--eval-source on` explicitly uses the on revision's
historical case definitions instead. The
importer accepts single-request cases with file-existence and explicit shell
checks; unsupported formats fail preparation.

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/commit_eval.py run \
  --commit a3863a324c86fa6ea4eccad07aa0be479f3383cd --expanded --profile full \
  --suite behavior --repeats 2 --timeout 180 --max-parallel 2
```

For routing, use `--suite routing --repeats 1`. Full mode loads the complete
discovered catalog. `--profile focused` is available for behavioral tests and
loads the target with its declared supporting skills. Add `--case` for a single
case. The model, graders, and limits remain the same across off/on.

Discovery covers direct skill directories under `agents/skills/` and
`terminal/opencode/skills/`, plus explicit vendored entries in `expanded.py`.
It does not read the live host's skills or silently resolve untracked aliases.
Invalid metadata and duplicate names stop the run. Historical Markdown link
warnings remain recorded because some reference examples or documentation
outside the skill package. Valid cross-skill links within the catalog are allowed.

`coverage.json` separates discovered packages, loaded packages by group, selected
behavioral cases, positive routing cases, and missing coverage. It does not count
merely available skills as behaviorally tested. `manifest.json` records the
import sources and case hashes, evaluator source, profile, and actual planned rows.

See [the expanded a3863a3 results](EXPANDED-a3863a3.md), including a real warning
deletion, an ambiguous test repaired equally for both revisions, and remaining
coverage gaps. Counterexample tests run with the normal unittest command. They
require the study commit to be available locally and use no model calls.

## Read results

Each run prints its evidence directory. Open its `summary.md` and inspect
`summary.json` for per-attempt activation, quality, tokens, and evidence paths.
Coder Eval's detailed reports are under `results/`.

- **Outcome:** all required task checks passed. Activation cannot increase this score.
- **Routing:** successful `Skill` tool calls satisfy the required/allowed sets.
  Quoted skill names, failed tool calls, and ordinary file reads do not count.
- **Quality:** advisory checks for removed complexity. These do not establish readability.
- **Human review:** writing and read-only simplification cases require inspection
  for relevance, source support, attribution, and omitted claims. Reports list
  pending outputs at the top level; automatic success does not mean human approval.
- **Execution:** missing attempts, incomplete execution, changed grader files,
  or failed catalog checks invalidate the comparison. No outcome delta is shown.

The native `skill_triggered` criterion also records a broader, informational
engagement signal that can include file-path references. The pilot's routing
summary and exit status use successful skill-tool events instead. Coder Eval's
native weighted score is zero for routing tasks because all native routing
criteria are informational. Use `summary.md`, not that score, as the routing gate.

Rebuild a summary from recorded evidence without another model call:

```sh
uv run --project terminal/bin/skill-evals python terminal/bin/skill-evals/pilot.py report \
  --run-dir /path/to/run-directory
```

`report` recomputes summary metrics, not artifact grades. Use a fresh run after
changing a checker. The existing harness's regrade command remains separate.
Run and plan commands refuse an existing `--run-dir` to avoid mixed evidence.

`assessment_status` is `invalid`, `automatic_checks_failed`, `needs_review`, or
`passed`. `needs_review` means the automatic checks passed but qualitative review
is still required. The runner does not infer or record human approval.

Exit `0` means the automatic checks passed. Outcome or routing failures return
nonzero. Invalid or incomplete summaries return `2`; upstream failures may
return other nonzero codes. Manual review remains separate from exit status.

## Limits and safety

- This is **host execution**, not an OS security sandbox. Use trusted cases and
  skills. The agent and executable checks can run code with your user privileges.
- Each attempt gets a private HOME and XDG directories. Host skill scans and
  external plugins are disabled. The launcher rejects system-managed OpenCode
  configuration and checks both the effective configuration and visible catalog
  before starting the task. Skill bundles exclude `evals/` and reject internal symlinks.
- Fixtures and checkers are snapshotted outside the candidate workdir. The agent
  receives only prepared fixture files and the selected skill bundle. Host mode
  cannot stop hostile code from accessing other host paths.
- Only the selected provider's API/OAuth authentication is copied to a private
  temporary directory, not the report tree. Remote-configuration login records
  and unrelated provider credentials are not copied.
  Normal exits and handled termination remove it. An uncatchable process kill
  can leave a private temporary directory. Reports can contain sensitive content
  if a candidate reads or emits it; review them before sharing.
- `--timeout` limits the agent turn. An additional 60 seconds covers task setup
  and grading. The token limit is 100,000 per attempt, checked at runtime event
  boundaries. **There is no enforced total dollar limit.** Missing model pricing
  can make upstream cost totals incomplete; recorded costs are not billing proof.
- Coder Eval can retry agent transport failures. The pilot invalidates a run
  when catalog-audit counts show extra launches rather than silently treating
  those launches as independent, fresh repetitions.
- Runs made before isolation version 2 lack an effective-configuration audit.
  Rebuilding those summaries now marks them invalid for comparison. Their raw
  attempt results remain available as preliminary integration evidence.
- Multi-turn workflows, Docker parity, automatic CI model runs, and migration
of the existing case corpus are outside this pilot. Keep using the existing
runner for them.

## Add a case

1. Start with an observed failure and define its required outcome.
2. Add a native task under `tasks/`, tagged with `behavior` and its target skill.
3. Register trusted input fixtures in `FIXTURES` in `pilot.py`. Setup commands
   copy from `$SETUP_ROOT`; checks call `$SKILL_EVALS_ROOT/check.mjs`.
4. Add checker tests with both correct outputs and believable wrong outputs.
5. Add a pressure variation to `pressure.json` when it tests a real failure mode.
6. Run absent/current comparisons before changing the skill. Retain clean cases
   to detect over-reporting and unnecessary changes.

For routing cases, edit `routing.json`. Do not rewrite a realistic failed prompt
just to improve the score. Review ambiguous ownership before assigning labels.

## Development checks

From this directory:

```sh
uv run ruff check .
uv run ruff format --check .
uv run python -m unittest -v
uv run python pilot.py check
node --check check.mjs
```
