---
name: write-pr-body
description: Use when writing or editing a pull request title or body. Drafts concise, evidence-grounded text from the final branch diff, with proportional design context, code examples, visual comparisons, and benchmark tables. Does not publish PRs, run checks, or write commit messages.
---

# Writing a PR body/title

Write the final aggregate base-to-head outcome as the eventual squash record.
Use concise bullets for text, not an essay by default. Preserve the problem,
result, and chosen design reasoning that a future reader needs.

## 1. Establish the change

- Read repository instructions, contribution guidance, and the PR template.
  Check recent PR titles and history for local prefixes and grammar.
- Identify the intended target branch and candidate head. Inspect all branch
  commits as evidence, then the complete aggregate PR diff. Read affected code,
  callers, and tests where needed to establish behavior. Keep uncommitted work
  separate from the PR outcome.
- Read linked issues, specifications, and decisions when available. Recover the
  prior problem, resulting behavior, and material constraints from evidence,
  not from filenames, symbols, or titles alone. Links supplement a self-contained
  explanation.
- For an existing PR, read its current title and full body with `gh`, using the
  `github` skill for GitHub operations. Existing prose is a claim to check
  against the final diff, not proof of what shipped.

Proceed when the target, head, outcome, and supporting facts are known. Ask
about a material ambiguity rather than filling it with plausible text.

## 2. Choose useful depth

- Narrow, low-risk correction: a precise title and brief problem/outcome bullets.
- Bounded feature or non-obvious local change: add only the mechanism, chosen
  tradeoff, or compatibility detail needed to understand the result.
- Truly difficult, high-risk, broad, or exceptional engineering work can justify
  technical-blog depth: context, problem-to-decision story, concrete invariants,
  and system consequences. Let the actual review burden justify this depth,
  not enthusiasm or line count. Keep bullets where they remain clear.

Read [classification](references/classifying-changes.md) when depth is unclear
or security, migration, concurrency, public-contract, or recovery risks matter.
Read [shapes and examples](references/writing-pull-requests.md) when choosing a
structure or including code, diagrams, visual changes, or benchmarks. For the
user's writing style, read [my pull requests](references/my-pull-requests.md).

## 3. Draft the title and body

- Title: name the specific outcome across the whole diff. Follow local prefix
  conventions; otherwise use direct outcome wording. Avoid vague titles such
  as "Improve things". Do not invent a fixed character limit.
- Body: lead with concise bullets explaining what changes and why. Add short
  headings only when they help navigation or the compatible template needs them.
  Keep prose around code, diagrams, and tables in bullets too. Omit empty sections.
- Describe only the final aggregate change. Exclude intermediate refactors,
  dropped designs, PR line-count shrinkage, commit chronology, and tool or agent
  activity. A substantive tradeoff explaining the chosen design is useful;
  a development diary is not.
- Prefer actual internal or usage code snippets when they explain more clearly
  than prose. Use relevant fenced `mermaid` diagrams for relationships or flows
  that need explanation, not as mandatory decoration for trivial changes.
  For deep explanations, code permalinks and images can support the story.
- Keep validation, test, and CI reports out of the proposed body, including
  "I ran tests" wording, testing headings, and command checklists. This wording
  rule does not waive required checks in another workflow. Report missing checks
  or readiness blockers outside the body; they can block publishing.
- If the template requires test reporting or otherwise conflicts with these
  rules, state the conflict outside the proposed body and ask how to proceed.
  Do not silently remove the required field or fill it with prohibited wording.

### Visual changes

Direct or indirect visual changes require a before/after table with real uploaded
images or videos: baseline from the target branch, candidate from the PR. Match
the scenario and viewing conditions, and identify the corresponding refs/SHAs.
Use only verified uploaded asset URLs, never fabricated URLs or local paths.

If either side or its provenance is missing, ask for the material and any needed
upload authorization separately. Do not upload or mutate a remote in writing-only
mode. Mark the draft incomplete in separate notes until the real comparison is
available; do not insert pretend media or claim visual equivalence.

### Benchmarks

Benchmarks always require a before/after comparison table: target-branch baseline
and PR candidate, actual measured values, refs/SHAs, units, and the same workload
and environment. Include relevant measurement context and uncertainty. Derived
deltas are optional and must follow from the supplied measurements.

If measurements are absent or not comparable, request the missing evidence
outside the body. Do not run benchmarks in this writing-only workflow, invent a
comparison, or turn a candidate-only result into an improvement claim. Benchmark
tables explain performance outcomes; they are not general check reports.

## 4. Recheck and return

Re-read the final diff before returning. If the target or head changed, inspect
the new aggregate diff and revise the draft. Check every factual claim, snippet,
diagram, media label, measurement, and link against the inspected evidence.
Remove claims about dropped code or unsupported motivation. Keep material risk,
compatibility, and recovery facts without inventing scope to justify more prose.

Return a ready-to-use **Title** and **Body** in Markdown. Keep material unknowns,
missing evidence, template conflicts, and other blockers in a separate **Notes**
section outside the proposed body; omit notes when none remain. A blocked draft
is not ready to publish. When only a title or only a body was requested, return
that requested part.

Drafting authorizes text only: do not commit, push, create or edit a remote PR,
upload media, or run checks. Publishing belongs to `create-pr`; commits belong
to `github`. A request to draft never authorizes those actions.

For the origin of these choices, read [research basis](references/research-basis.md).
