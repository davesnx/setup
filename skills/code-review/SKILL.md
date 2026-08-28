---
name: code-review
description: Review local changes, branch diffs, commits, or pull requests for correctness, security, regressions, maintainability, repository standards, specification compliance, and blast radius. Use for "review", "code review", "review my changes", "review PR", "review since X", "thermo", "thermonuclear", "deep review", "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", "tear this apart", "blast radius", "what could this break", "review canvas", "visual PR review", "PR walkthrough", or "review and ship". Accepts an optional fixed point, PR number, or PR URL.
---

# Code Review

Review changed code, trace its effects beyond the diff, and prove the safety claims that matter. Report only issues introduced or exposed by the change.

## Modes

Choose one review mode from the request:

- **Standard**: Default review. Apply every lens in one lead pass and report findings without edits.
- **Deep**: Use for "thermo", "thermonuclear", "thermos", "deep review", or an especially strict audit. Use the shared parallel review pass, then synthesize and verify its strongest claims.
- **Adversarial / Multi-model**: Use for "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", or "tear this apart". Use the same parallel pass as Deep, prefer different available models, and add an agreement map and explicit lead judgment. This is not a second fan-out workflow.
- **Blast radius**: Use for "blast radius", "what could this break", or a small change whose downstream effects are unclear. Focus the report on transitive risk and executable proof.

Ship and Canvas modify the selected review mode:

- **Ship**: Use only when the user asks to review and ship, commit, push, or open or update a PR. Review first, then fix and publish only what the request authorizes. Never treat reviewer suggestions as permission to edit.
- **Canvas output**: Use when the user asks for a review canvas, visual PR review, interactive walkthrough, or HTML review. Complete the selected review mode first, then render the result with `references/canvas.md`.

## 1. Define The Scope

Select one review target:

- **Uncommitted work**: Read unstaged and staged diffs. If both are empty, use the current branch against its merge base with the repository's base branch.
- **Fixed point**: Confirm the commit, branch, or tag with `git rev-parse`, then use `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`.
- **PR number or URL**: Fetch the diff with `gh pr diff` and intent with `gh pr view --json title,body,commits`. Do not read review comments yet.

Resolve a user-supplied short branch name before the review. If `git rev-parse` does not resolve it, search local and remote branches for a unique suffix match. Do not guess when more than one branch matches.

When the `diff_review` tool is available and the review target is the current checkout, call it with `raw: "--base <comparison-base>"`. The `--base` value is the branch to compare against, not the branch being reviewed. The tool does not accept a positional review target. For a branch that is not checked out, use the explicit `git diff` workflow instead.

Fail early on an invalid reference or empty diff. Record the exact diff command so every reviewer uses the same scope.

Read every changed line. Also read the surrounding functions and any callers, consumers, tests, configuration, schemas, or dependency source needed to evaluate behavior without guessing. Do not report unrelated pre-existing issues.

## 2. Establish Intent And Rules

Find the originating intent in this order:

1. The user's request and conversation.
2. PR description and linked issue.
3. Commit messages.
4. A provided path or a matching spec under `docs/`, `specs/`, or `.scratch/`.

Read repository standards from `AGENTS.md`, `CONTRIBUTING.md`, coding standards, architecture docs, and instructions near the changed files. If tracker details are needed and `docs/agents/issue-tracker.md` is absent, infer the tracker from the remote and available CLI; ask only when ambiguous.

## 3. Load The Review Lenses

Read all four references before reviewing:

- [Correctness and security](references/correctness-security.md)
- [Maintainability](references/maintainability.md)
- [Standards and spec](references/standards-spec.md)
- [Blast radius and proof](references/blast-radius.md)

Every mode uses every lens. The mode changes depth and execution, not coverage.

## 4. Execute The Review

### Standard

Apply all four lenses yourself. Trace each candidate finding until it is confirmed or cleared. Run a focused test or script for the most important safety fact when practical.

### Shared Parallel Pass

Launch independent read-only reviewers in one parallel batch:

1. A correctness and security reviewer using `references/correctness-security.md`.
2. A maintainability reviewer using `references/maintainability.md`.
3. A standards reviewer using the Standards section of `references/standards-spec.md`.
4. A spec reviewer using the Spec section of `references/standards-spec.md`; skip it when no spec exists.

Give every reviewer the same diff command, commit list, intent, required context paths, and all four lens references. Assign one primary lens to each reviewer so coverage stays clear, but permit critical cross-lens findings. Ask for prioritized findings with `file:line`, an execution path, impact, concrete remedy, and proof or missing evidence. Require high conviction and no cosmetic padding.

Deep and Adversarial modes both use this pass. Do not launch a second reviewer group for an Adversarial request.

For Adversarial mode, select different available models for the reviewers when the agent runner supports model selection. Do not name or depend on hard-coded model IDs. If model selection is unavailable, use the same independent read-only reviewer jobs without selecting models and state in the final review that run independence, not confirmed model diversity, supplied the adversarial signal. If independent reviewer jobs are unavailable, state that limitation and perform a Standard review; do not invent reviewer evidence.

### Deep

When results return, deduplicate them and resolve disagreements with direct repository evidence. Agreement raises confidence but does not replace verification. Apply the blast-radius lens yourself and run the cheapest proof that can falsify the highest-risk safety claim.

### Adversarial / Multi-model

Read [Adversarial synthesis and lead judgment](references/adversarial-synthesis.md). Build the agreement map before deciding the verdict. Treat consensus as a reason to verify a claim first, not as proof. Investigate lone correctness or security findings on their merits. Resolve explicit disagreements with repository evidence and state any disagreement that remains unresolved.

Act as the lead reviewer, not a vote counter. Put every candidate finding in **Act On**, **Consider**, or **Dismissed**, with a short reason and the reviewers that raised it. Do not auto-apply any suggestion.

### Blast Radius

Start from the key safety fact. Trace effects through boundaries that symbol search misses, then run the cheapest focused proof. Still check correctness, maintainability, standards, and intent, but keep the output centered on confirmed downstream risk, cleared cases, and proof level.

## 5. Calibrate And Verify

- **Critical**: Exploitable security issue, realistic data loss, or a severe regression on a reachable path.
- **High**: Meaningful correctness, compatibility, feature-gate, or structural regression that should block the change.
- **Medium**: Real edge case, maintainability regression, standards breach, or missing requirement with limited impact.
- **Low**: Useful improvement that does not block the change. Keep these sparse.

Never present unfinished research as a finding. Check the other side of an API, configuration, caller, or persistence boundary when the code is available. Distinguish deliberate behavior changes from accidental impact. Review PR discussion only after the independent audit so earlier comments do not anchor the review. If the audit found Medium or higher issues, fetch comments and reviews now and evaluate any additional claims against the code.

## 6. Report

For Standard, Deep, and Blast Radius reviews, lead with findings ordered by severity. For Adversarial reviews, state the intent and reviewer evidence first, then put findings under the lead-judgment sections. Each finding must include:

- `file:line`
- the failure or degradation
- the reachable execution path or structural evidence
- realistic impact
- a concrete remedy
- proof or the exact missing evidence

For Standard, Deep, and Blast Radius reviews, then report:

```markdown
## Standards
Documented violations and named smell judgments, or "Pass".

## Spec
Missing, incorrect, or extra behavior with requirement citations, or "No spec available".

## Blast Radius
- Safety fact: <claim>
- Proof level: <1-5>
- Evidence: <command, output, source, or "unproven">

## Cleared
Important risks checked and ruled out.

## Summary
Files reviewed, finding counts by severity, checks run, and overall verdict.
```

If there are no findings, say so explicitly and name the important risks and boundaries that were checked. Do not hide a clean review behind a long summary.

For Adversarial reviews, use this structure even when a section is empty:

```markdown
## Intent
The change's intended outcome.

## Reviewer Evidence
- Reviewer identifier and model when known; primary lens; finding count; strongest verified evidence or checked scope.

## Act On
Confirmed findings that should block the change, ordered by severity.

## Consider
Legitimate concerns whose cost or impact does not clearly justify blocking.

## Dismissed
Rejected claims with the repository evidence or context that cleared them.

## Agreement Map
- Consensus findings and what verification confirmed.
- Lone findings and how they were treated.
- Explicit disagreements and how they were resolved or why they remain open.
- Model-selection limitation, when model diversity could not be confirmed.

## Standards
Documented violations and named smell judgments, or "Pass".

## Spec
Missing, incorrect, or extra behavior with requirement citations, or "No spec available".

## Blast Radius
- Safety fact: <claim>
- Proof level: <1-5>
- Evidence: <command, output, source, or "unproven">

## Cleared
Important risks checked and ruled out.

## Summary
Files reviewed, finding counts by severity, checks run, and overall verdict.
```

When Canvas output is selected, read [references/canvas.md](references/canvas.md) and render the completed report after the Markdown findings. Preserve the same severity, evidence, and cleared-risk conclusions in both outputs.

## 7. Modification Policy

Without the Ship modifier, Standard, Deep, Adversarial, and Blast Radius modes are report-only. Put ad hoc proof scripts under `/tmp`; do not modify the repository to produce evidence. Offer to fix confirmed Critical, High, or Medium findings after presenting the review.

In Ship mode:

1. Run the repository's required format, lint, typecheck, build, and relevant tests.
2. Fix only lead-confirmed blockers within the requested scope and rerun affected checks. Do not apply raw reviewer suggestions.
3. Load `github` Commit mode before committing. Stage only intended files and do not bypass hooks.
4. Push and open or update a PR only when explicitly requested.
5. Report findings, changes, checks, and the PR URL when one exists.

For large diffs, prioritize risky files and boundaries, but do not silently omit files from the declared scope.
