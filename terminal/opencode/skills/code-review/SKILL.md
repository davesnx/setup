---
name: code-review
description: Review code changes, commits, or PRs on request, including deep, adversarial, and blast-radius reviews. Report verified risks; edit or publish only with authorization.
---

# Code Review

Review changed code, trace its effects beyond the diff, and prove the safety claims that matter. Report only issues introduced or exposed by the change.

Review directly by default. Add independent reviewers only when the user asks
for them or distinct risks justify the coordination cost. Depth means stronger
investigation and evidence, not a fixed reviewer count. A complete direct review
is sufficient when extra reviewers would repeat the same work.

Review alone is report-only. Preserve source files and user changes. Reviewer findings
do not authorize fixes, commits, pushes, or external comments. Use temporary
files for ad hoc proof scripts; a requested report file is an output, not
permission to change the code under review.

## Modes

Choose one review mode from the request:

- **Standard**: Default review. Check the relevant risks directly and report findings without edits.
- **Deep**: For an explicit deep or thermonuclear review, read [advanced review](references/advanced-review.md). Trace high-risk boundaries and challenge the strongest safety claims.
- **Adversarial / Multi-model**: For "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", or "tear this apart", read [advanced review](references/advanced-review.md). Test competing explanations and give an evidence-based lead judgment. Honor explicit requests for independent reviewers or multiple models.
- **Blast radius**: For "blast radius", "what could this break", or unclear downstream effects, read [blast radius and proof](references/blast-radius.md). Focus on transitive risk and executable proof.

Ship and Canvas modify the selected review mode:

- **Ship**: When the user asks to review and fix, ship, commit, push, or open or update a PR, read [authorized follow-through](references/ship.md). Each action remains limited to the request; publishing authority alone does not authorize source fixes.
- **Canvas output**: Use when the user asks for a review canvas, visual PR review, interactive walkthrough, or HTML review. Complete the selected review mode first, then render the result with `references/canvas.md`.

## 1. Define The Scope

Select one review target:

- **Uncommitted work**: Read unstaged and staged diffs. If both are empty, use the current branch against its merge base with the repository's base branch.
- **Fixed point**: Confirm the commit, branch, or tag with `git rev-parse`, then use `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`.
- **PR number or URL**: Fetch the diff with `gh pr diff` and intent with `gh pr view --json title,body,commits`. Do not read review comments yet.

Resolve a user-supplied short branch name before the review. If `git rev-parse` does not resolve it, search local and remote branches for a unique suffix match. Do not guess when more than one branch matches.

If using `diff_review` for the current checkout, pass `raw: "--base <comparison-base>"`. The base is the branch to compare against, not the branch being reviewed; the tool does not accept a positional target. Use explicit `git diff` for another branch. Do not duplicate an already sufficient diff read just because another tool is available.

Fail early on an invalid reference or empty diff. Record the exact diff command so every reviewer uses the same scope.

Read every changed line. Also read the surrounding functions and any callers, consumers, tests, configuration, schemas, or dependency source needed to evaluate behavior without guessing. Do not report unrelated pre-existing issues.

## 2. Establish Intent And Rules

Find the originating intent in this order:

1. The user's request and conversation.
2. PR description and linked issue.
3. Commit messages.
4. A provided path or a matching spec under `docs/`, `specs/`, or `.scratch/`.

Read repository standards from `AGENTS.md`, `CONTRIBUTING.md`, coding standards, architecture docs, and instructions near the changed files. If tracker details are needed and `docs/agents/issue-tracker.md` is absent, infer the tracker from the remote and available CLI; ask only when ambiguous.

## 3. Select Review Details

Check correctness, security, maintainability, repository standards, intent, and
downstream effects in every mode. Load reference details only for relevant risks
or an assigned primary lens:

- [Correctness and security](references/correctness-security.md): behavior, trust boundaries, state, or failure paths.
- [Maintainability](references/maintainability.md): structural or ownership decisions.
- [Standards and spec](references/standards-spec.md): rule compliance or requirement questions.
- [Blast radius and proof](references/blast-radius.md): downstream safety claims or unclear consumers.

Reference selection changes detail, not coverage. A small, clear change can be
reviewed from the code and repository rules without loading all four files.

## 4. Execute The Review

Trace each candidate finding until it is confirmed or cleared. Check the other
side of API, configuration, caller, or persistence boundaries when available.
Run the smallest focused test or script that can falsify a material safety claim
when practical. If it cannot run, state the missing evidence and limit the claim.

Use the selected mode's reference for deeper investigation. If independent
coverage is justified in Standard mode, read the coordination section of
[advanced review](references/advanced-review.md). Do not assign a reviewer to
each lens by default. Combine overlapping work and verify the resulting claims
against the repository; agreement alone is not proof.

## 5. Calibrate And Verify

- **Critical**: Exploitable security issue, realistic data loss, or a severe regression on a reachable path.
- **High**: Meaningful correctness, compatibility, feature-gate, or structural regression that should block the change.
- **Medium**: Real edge case, maintainability regression, standards breach, or missing requirement with limited impact.
- **Low**: Useful improvement that does not block the change. Keep these sparse.

Never present unfinished research as a finding. Check the other side of an API, configuration, caller, or persistence boundary when the code is available. Distinguish deliberate behavior changes from accidental impact. Review PR discussion only after the independent audit so earlier comments do not anchor the review. If the audit found Medium or higher issues, fetch comments and reviews now and evaluate any additional claims against the code.

## 6. Report

Lead with the findings or verdict in the layout that best fits the scope. Order
findings by severity. Each finding must include:

- `file:line`
- the failure or degradation
- the reachable execution path or structural evidence
- realistic impact
- a concrete remedy
- proof or the exact missing evidence

Then give the scope, checks run, verdict, and material limits. Include standards
or requirement citations where they support a finding. For important downstream
safety claims, state the fact, proof level, and evidence or mark it unproven.
Mention important cleared risks when they explain the verdict. Use headings only
when they help; omit empty or irrelevant sections.

If there are no findings, say so explicitly and name the important risks and boundaries that were checked. Do not hide a clean review behind a long summary.

For Deep or Adversarial reviews, preserve the material challenged claims,
decisions, and evidence described in the selected reference. Report only real
reviewer contributions; a direct review does not need an empty reviewer table.

When Canvas output is selected, read [references/canvas.md](references/canvas.md) and render the completed report after the Markdown findings. Preserve the same severity, evidence, and cleared-risk conclusions in both outputs.

For large diffs, prioritize risky files and boundaries, but do not silently omit files from the declared scope.
