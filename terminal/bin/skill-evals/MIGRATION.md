# Eval runner ownership and retirement

## Current decision

Keep `terminal/bin/eval-harness` until its remaining workflows have a verified
replacement. Use `skill-evals` for revision comparisons, mutation experiments,
catalog routing, and the explicitly imported single-request cases.

Keep the skill-local `evals/` directories. They contain the prompts, fixtures,
and graders we are reusing. Replacing an execution engine does not make this
corpus obsolete. Preserve historical run evidence independently of either CLI.

## Remaining differences

| Capability | Existing eval-harness | New skill-evals wrapper |
| --- | --- | --- |
| Existing skill-local case corpus | Native schema support | Bounded importer for selected file/shell cases |
| Commit on/off and mutation comparisons | Separate existing workflows | Implemented with exact skill snapshots |
| Multi-turn reconstructed work tasks | Implemented, with separate prompts and fresh repetitions | Not implemented by this wrapper |
| Trusted setup scripts and recovery corpus | Eight reconstructed tasks | Not migrated |
| OpenCode Docker execution | Implemented for supplied images | Not verified; the upstream default image lacks OpenCode |
| Regrade saved artifacts without rerunning the candidate | Implemented | `report` only recomputes stored scores, not artifact grades |
| Existing baselines, history and cleanup | Existing CLI and state layout | No migration of that state or command contract |
| Writing grader test parser | Normal command imports legacy `yaml` dependency | Explicit Ruby option can run independently; dependency ownership still needs a permanent decision |

This is an implementation/ownership comparison from source inspection, not a
fresh verification of every legacy feature on this machine.

## Before removing the old runner

1. Port the remaining workflow cases with their setup, multi-turn, failure,
   recovery, and manual-review semantics.
2. Verify saved-evidence regrading and a historical-data retention policy.
3. Verify the required execution environment, including nspawn and Docker if
   retained. Match timeouts, cleanup, and failure exit behavior.
4. Move shared test dependencies out of the legacy runner's install directory.
5. Place the adopted tooling according to [the repository layout](../../../AGENTS.md#where-things-go).
6. Update the root installer, command links, checks, and documentation in one
   deliberate cutover. Retire the old package and patches only after that passes.

Do not keep two default runners indefinitely. The current overlap is a migration
boundary, not a reason to duplicate future case definitions.

## Corrections after the expanded study

- The canonical blog case now specifies JSON in `review.md` and cited findings.
- Post-draft requires complete paragraph evidence records and preserves its
  source notes. The answered-round case now requires one answered round.
- New runs use snapshotted working-tree eval definitions by default, held fixed
  across the skill revisions. `--eval-source on` explicitly selects historical
  case definitions instead. The registry no longer patches the blog prompt.
- Reports distinguish complete comparison evidence from `needs_review`, and
  list the outputs requiring qualitative review. Exit 0 remains the automatic
  check result; `assessment_status` must be consulted for assessment completion.

On September 16, 2026, the revised contracts passed four focused live attempts:

- `.runs/commit-peu6r7j4/`: blog-post, off/on, one attempt each.
- `.runs/commit-vjrzr_t8/`: post-draft, off/on, one attempt each.

Both summaries show `needs_review`. No skill implementation or legacy runner was
removed as part of these corrections. Earlier study tables retain their original
grader versions and must not be combined with these stricter contracts.
