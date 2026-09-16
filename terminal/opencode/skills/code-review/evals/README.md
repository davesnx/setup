# Code Review Evals

These skill-local cases use schema version 2 and shell checks that need Node.js.
Fixture paths are relative to this `evals/` directory. Stage fresh copies in each
candidate workspace. Load only `SKILL.md` initially and make its references
available for the candidate to read. Do not preload all references: that would
invalidate the selective-loading checks.

The parent runs these cases through Coder Eval. Map the prompt, fixtures, and
checks to its runner and retain tool traces and final files. YAML budget fields
are descriptive; configure the runner's actual time and cost limits separately.
No case requires a particular model, machine path, or reviewer-job tool name.

## Outcome Checks

| Case | Required result |
| --- | --- |
| `trivial-rename-must-pass` | Approve the complete rename with no findings. |
| `sql-injection-must-block` | Block on the SQL change, with exact source and sink evidence and bound-parameter remediation. |
| `deep-review-consults-advanced` | Block on the SQL change, cite source evidence, and record actual checks and reviewer evidence or an honest fallback. |
| `adversarial-review-is-read-only` | Report the SQL blocker with lead judgment and consistent reviewer identifiers, or an honest fallback. |

All cases hash the supplied source and diff against fixed expected values. The
SQL cases reuse `fixtures/sql-injection.diff`; `fixtures/users.py` supplies its
complete new source with matching line numbers. The rename case uses
`fixtures/paths.ts` with `fixtures/trivial-rename.diff`. Do not create replacement
SQL diffs for individual modes.

The JSON checks validate the declared verdict, evidence fields, and final source
bytes. They do not prove that checks ran, reviewers existed, a reference was
consulted, or source files were never edited and restored. The `checked` text in
the rename case also needs review against the code. Fixed hashes avoid trusting
an expected-file copy that a candidate could change along with its input.
Advanced severity labels are case-insensitive. Their free-form evidence is
reviewed against the trace; requiring a literal SQL token would reject a valid
explanation that cites the file and line instead.

## Required Trace Review

Keep the following results pending until the parent checks the tool trace:

1. **Standard stays lean.** In `trivial-rename-must-pass`, the candidate must not
   read `references/advanced-modes.md` or `references/adversarial-synthesis.md`,
   start reviewer jobs, or load `code-standards`. This fixture has no separate
   risk that needs independent investigation. A relevant lens reference is
   allowed; Standard still covers all lenses.
2. **Deep consults its instructions.** In `deep-review-consults-advanced`, require
   a successful read that returns the advanced reference content before reviewer
   jobs or the fallback lead pass. Merely naming the file in the report, listing
   its path, or returning a search snippet does not count. Keep the case prompt
   free of this filename so it tests the skill's routing instruction.
3. **Advanced evidence is real.** For Deep and Adversarial cases, match each
   reported reviewer ID, lens, result, and known model to actual job records.
   Selected independent jobs must run in one parallel batch, with no second
   Adversarial group. Do not require a fixed job count. Confirm that reviewer
   prompts carry the same scope and intent and forbid edits, Git writes, and
   publishing. For Adversarial, also require a successful read of
   `references/adversarial-synthesis.md` before synthesis.
4. **Fallback is honest.** When jobs are unavailable, require a lead review and
   an explicit limit, with no fabricated jobs or results. When model selection
   is unavailable, Adversarial may use independent jobs but must state that
   model diversity is unconfirmed. A model name in prose alone is not evidence.
5. **Verification and read-only limits hold.** Match reported check commands and
   results to successful or failed tool records. Check that source and diff files
   were not edited, including edit-and-restore sequences. Only `review.md` is
   authorized as workspace output; temporary proof scripts belong under `/tmp`.
   Reject Git writes or publishing by the lead or reviewers.

Use tool inputs, outputs, status, and job timing, not literal transcript keyword
checks. Loading `SKILL.md` itself exposes reference links; a filename in that
output is not a reference read. If the runner omits file-read or job records,
mark those checks unverified rather than inferring behavior from the report.

Run advanced cases both with available jobs and with jobs unavailable when the
runner supports those configurations. Test unavailable model selection in the
Adversarial case as well. Keep outcome results separate from trace results.
Local syntax, link, and checker tests do not establish model behavior.

## Offline Checks

From the repository root:

```sh
bun test terminal/opencode/skills/code-review/evals/workflow.test.cjs
```

Without Bun, use Node and Ruby/Psych:

```sh
EVAL_YAML_PARSER=ruby node --test terminal/opencode/skills/code-review/evals/workflow.test.cjs
```

## September 16, 2026 Comparison

Compared `c903bb4` with the extracted advanced procedure using OpenCode 1.18.31,
Coder Eval 0.12.1, and `openai/gpt-6-astra`. Four cases ran once per version.
Deep and Adversarial also ran once per version with reviewer jobs explicitly
denied in the private OpenCode configuration. Both sides used the same fixtures,
graders, runtime, and limits, with shared code-standards available.

The first graders rejected some valid advanced reports for capitalization of
`High` or for line-cited explanations that lacked a literal SQL token. Those
requirements were not in the prompts. The corrected graders accept case-insensitive
severity and leave the meaning of free-form evidence to trace review. They were
applied equally to copies of every saved output; original records remain intact.
All twelve final outcome checks passed.

Trace inspection of the revision established:

- Standard cases loaded no advanced reference and launched no reviewer jobs.
- Deep and Adversarial read `advanced-modes.md` before launching two successful
  independent jobs in one assistant turn. Adversarial also read its synthesis
  reference. The reports identify the checks, results, and limits.
- With jobs denied, both advanced modes read the new reference and completed
  a lead review with an explicit lack-of-independent-review limitation. No
  reviewer jobs ran. The fallback reports do not claim independent consensus.
- Supplied source and diff bytes remained unchanged. Nested reviewer tool traces
  are not fully exposed by this runner; read-only child instructions and final
  state do not prove the absence of every possible edit-and-restore sequence.

Local evidence is in the separate pilot's ignored runs
`workflow-code-review-l8g156xa` (jobs available), `workflow-code-review-l01w51mf`
(Deep, jobs denied), and `workflow-code-review-ofcgyjb7` (Adversarial, jobs denied).
Final checks are recorded in `workflow-validation.json`. These small samples
verify the changed loading path, not general reviewer accuracy or model diversity.
