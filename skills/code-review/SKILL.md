---
name: code-review
description: Review local changes, branch diffs, commits, or pull requests for correctness, security, regressions, maintainability, repository standards, specification compliance, and blast radius. Use for "review", "code review", "review my changes", "review PR", "review since X", "thermo", "thermonuclear", "deep review", "blast radius", "what could this break", "review canvas", "visual PR review", "PR walkthrough", or "review and ship". Accepts an optional fixed point, PR number, or PR URL.
---

# Code Review

Review changed code, trace its effects beyond the diff, and prove the safety claims that matter. Report only issues introduced or exposed by the change.

## Modes

Infer the mode from the request:

- **Standard**: Default review. Apply every lens in one lead pass and report findings without edits.
- **Deep**: Use for "thermo", "thermonuclear", "thermos", "deep review", or an especially strict audit. Run independent lenses in parallel, then synthesize and verify their strongest claims.
- **Blast radius**: Use for "blast radius", "what could this break", or a small change whose downstream effects are unclear. Focus the report on transitive risk and executable proof.
- **Ship**: Use only when the user asks to review and ship, commit, push, or open or update a PR. Review first, then fix and publish only what the request authorizes.
- **Canvas output**: Use when the user asks for a review canvas, visual PR review, interactive walkthrough, or HTML review. Complete Standard or Deep review first, then render the result with `references/canvas.md`. Canvas is an output modifier and can combine with Deep mode.

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

### Deep

Launch independent read-only reviewers in one parallel batch:

1. A correctness and security reviewer using `references/correctness-security.md`.
2. A maintainability reviewer using `references/maintainability.md`.
3. A standards reviewer using the Standards section of `references/standards-spec.md`.
4. A spec reviewer using the Spec section of `references/standards-spec.md`; skip it when no spec exists.

Give every reviewer the same diff command, commit list, intent, and required context paths. Ask for prioritized findings with `file:line`, an execution path, impact, and concrete remedy. Require high conviction and no cosmetic padding.

When results return, deduplicate them and resolve disagreements with direct repository evidence. Agreement raises confidence but does not replace verification. Apply the blast-radius lens yourself and run the cheapest proof that can falsify the highest-risk safety claim.

### Blast Radius

Start from the key safety fact. Trace effects through boundaries that symbol search misses, then run the cheapest focused proof. Still check correctness, maintainability, standards, and intent, but keep the output centered on confirmed downstream risk, cleared cases, and proof level.

## 5. Calibrate And Verify

- **Critical**: Exploitable security issue, realistic data loss, or a severe regression on a reachable path.
- **High**: Meaningful correctness, compatibility, feature-gate, or structural regression that should block the change.
- **Medium**: Real edge case, maintainability regression, standards breach, or missing requirement with limited impact.
- **Low**: Useful improvement that does not block the change. Keep these sparse.

Never present unfinished research as a finding. Check the other side of an API, configuration, caller, or persistence boundary when the code is available. Distinguish deliberate behavior changes from accidental impact. Review PR discussion only after the independent audit so earlier comments do not anchor the review. If the audit found Medium or higher issues, fetch comments and reviews now and evaluate any additional claims against the code.

## 6. Report

Lead with findings, ordered by severity. Each finding must include:

- `file:line`
- the failure or degradation
- the reachable execution path or structural evidence
- realistic impact
- a concrete remedy
- proof or the exact missing evidence

Then report:

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

When Canvas output is selected, read [references/canvas.md](references/canvas.md) and render the completed report after the Markdown findings. Preserve the same severity, evidence, and cleared-risk conclusions in both outputs.

## 7. Modification Policy

Standard, Deep, and Blast Radius modes are report-only. Put ad hoc proof scripts under `/tmp`; do not modify the repository to produce evidence. Offer to fix confirmed Critical, High, or Medium findings after presenting the review.

In Ship mode:

1. Run the repository's required format, lint, typecheck, build, and relevant tests.
2. Fix confirmed blockers within the requested scope and rerun affected checks.
3. Load `github` Commit mode before committing. Stage only intended files and do not bypass hooks.
4. Push and open or update a PR only when explicitly requested.
5. Report findings, changes, checks, and the PR URL when one exists.

For large diffs, prioritize risky files and boundaries, but do not silently omit files from the declared scope.
