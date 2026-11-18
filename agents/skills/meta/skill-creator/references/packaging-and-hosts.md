# Packaging and hosts

Check capabilities rather than assuming every host has a CLI, browser, or
independent agents. Host support does not expand the user's permissions.

## Claude Code

Use [Evaluation](evaluation.md) for paired output runs when independent agents
are available. The bundled `scripts.run_eval` and `scripts.run_loop` use Claude;
check the CLI, Python dependencies, and authentication before
[description tuning](description-tuning.md). Do not pass an arbitrary Astra ID.
Verify the selected model is accepted by both evaluation and improvement paths.
Description selection also requires a candidate-only advertised catalog. Existing
plugin skills can make a profile unsupported even when authentication succeeds.
Preserve required hooks and report that limit instead of bypassing them; read the
[runner requirements](../scripts/README.md#unsupported-catalogs) before scoring.

## Claude.ai or no independent runs

If independent runs are unavailable, read the skill and execute cases one at a
time. Label these as same-session checks: the author knows the draft and earlier
answers. Do not claim a clean baseline comparison, benchmark gain, or blind
review from them. Skip those parts of the evaluation workflow.

Show prompts and outputs in chat if file or browser review is unavailable.
Otherwise use the static viewer. Collect feedback, revise, and rerun relevant
cases; keep iteration directories if a filesystem is available. Skip the Claude
description scripts unless the required CLI is actually available.

## Cowork

When independent agents are available, use candidate and baseline runs. Run
them sequentially if parallel execution causes timeouts. In a headless session,
generate the viewer with `--static <output-path>` before revising results. Provide
the file, then obtain the downloaded `feedback.json` and any required access.
Description tuning is optional after the body works; verify Claude subprocess
support rather than assuming it exists in every Cowork environment.

## OpenCode

The setup repository has a separate OpenCode eval-harness at
`terminal/bin/eval-harness/README.md` (from the repository root). Read that local
reference when available. It runs OpenCode with its own real, configured model;
it is not a Claude CLI alias. Select a supported provider/model through its
documented model settings. Do not route Astra IDs through `scripts.run_eval`
or `scripts.run_loop`.

Use the harness's case format, fresh repetitions, evidence records, and baseline
workflow. Its dry-run checks setup, not model behavior. Keep its results in its
native format unless an explicit conversion is validated. Missing usage remains
unmeasured, and reported cost is an estimate, not verified billing. Check runner
isolation and permissions before evaluating state-changing tasks.

For additional invocation guidance, load `writing-for-agents` by name through
the host's skill lookup and follow its Skill mechanics reference. If unavailable,
use the host's documentation; do not assume a sibling path or bypass permissions.
OpenCode ignores `disable-model-invocation`; do not promise manual-only behavior
from that field.

## Headless review

The viewer supports `--static <output-path>` without a running server. The user
downloads `feedback.json` through Submit All Reviews; place it in the iteration
directory after obtaining access. If static files cannot be shared, review in
chat and state that limitation. On remote hosts, follow local binding and port
rules if serving the viewer; never expose it publicly by default.

## Packaging

Package only when requested or authorized as part of delivery. Python and a
writable filesystem are required. From the skill-creator directory:

```bash
python3 -B -m scripts.package_skill /absolute/path/to/skill /approved/output-directory
```

The script validates metadata and creates `<name>.skill` as a ZIP archive.
Inspect its contents for required relative resources and unintended data before
delivery. Root `evals/` and build artifacts are excluded; keep evaluation evidence
separate. Packaging is not permission to install or publish.

The archive includes only this skill's directory, not sibling skills. Keep
bundled links within that directory. Resolve optional skills by host lookup,
with a documented fallback when unavailable; do not merge their directories.

For an installed read-only skill, copy the complete directory to an approved
writable workspace before editing. Preserve the original directory and frontmatter
name, so `research-helper` remains `research-helper.skill`, not a new versioned
identity. If manual packaging is needed, stage in a writable temporary location
before placing the archive in the output directory.

Use `present_files` when available and delivery is authorized. Otherwise return
the local archive path. Do not install or share it beyond the approved destination.
