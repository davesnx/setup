# Shapes And Examples

These shapes apply the rules in [the main skill](../SKILL.md). They are options,
not mandatory sections. The small examples below are illustrative, not evidence
for a real repository. Replace their facts with inspected facts before use.

## Quick Correction

Title: `Treat equal expiry timestamps as stale`

```markdown
- Expire cache entries when their expiry equals the current timestamp, rather
  than keeping them valid for another refresh cycle.
```

One bullet can explain both the boundary problem and the outcome. No headings
or supporting ceremony are needed.

## Bounded Change

Title: `Retry transient failures for idempotent storage writes`

```markdown
- Apply the shared retry policy to idempotent storage writes after transient
  503 responses, so timeout and backoff behavior matches other storage calls.
- Return permanent errors immediately; non-idempotent writes remain unchanged.
```

The second bullet earns its place only if both constraints are true. A behavior
example can be stronger than another paragraph about the implementation.

## Code And Diagrams

- Show a small actual usage or internal snippet from the final change. Include
  the surrounding contract needed to interpret it; label the language.
- Show old/new code only when the baseline and candidate support the comparison.
- For diagnostics, pair the source trigger with the relevant observed output,
  not an entire execution log. This is a behavior demonstration, not a check
  report. User PR #70 in [my pull requests](my-pull-requests.md) shows this shape.
- Use a fenced `mermaid` block when a real flow, dependency, or state transition
  is easier to understand as a diagram. Verify nodes and edges against the code.
  An obvious one-step correction does not need a diagram.
- Use candidate-SHA code permalinks for detailed explanations. Quote enough code
  that the link remains supplemental, not required to understand the decision.

## Visual Comparison

Include a rendered Markdown table with these columns:

| Scenario | Before: target branch and SHA | After: PR branch and SHA |
| --- | --- | --- |

Populate each row with the same scenario and actual uploaded images or videos
for both versions. Use descriptive image alt text or linked video labels. Name
the relevant viewport, state, theme, or input conditions in bullets beside the table.
Include indirect visual effects, such as wrapping changes from fonts or data.

This header is a shape, not a finished table. Do not return empty cells,
placeholder URLs, local file paths, or an after-only image as a completed
comparison. Request missing material or upload authorization in separate notes;
the writing skill does not upload assets.

## Benchmark Comparison

Include a rendered Markdown table with these columns:

| Metric and unit | Before: target branch and SHA | After: PR branch and SHA | Delta, if useful |
| --- | --- | --- | --- |

Fill both sides with real measurements. State the shared workload, input size,
environment, measurement method, and relevant sample count or uncertainty in
brief bullets next to the table. Distinguish mean, median, and percentile values.
Do not compare different workloads or machines as if they measured the change.

Only compute a delta from comparable values; label its direction and meaning.
Avoid relative percentages when the baseline is zero. A candidate-only number
cannot establish improvement. Missing baseline data belongs in separate notes,
not a guessed cell. Do not paste this empty header into a finished body.

## Difficult Or High-Risk Change

Use only the parts needed to explain actual consequences:

- Summary: the concrete problem and final outcome.
- Context: the constraint that makes the problem difficult.
- Design: the chosen mechanism, relevant code, and a diagram if it helps.
- Tradeoffs: the costs and limits of that choice, not the author's work history.
- Compatibility or rollout: precise old/new behavior and recovery preconditions.
- Comparisons: required visual or benchmark tables where applicable.

This can reach technical-blog length when the reasoning warrants it. Prefer a
few connected sections over a long inventory. Preserve explicit invariants:
"old readers accept new rows during deployment" is more useful than "backward
compatible" when that is the real contract. Do not invent such a contract.

## Output Boundary

Return the title separately from the body. If a fenced Markdown body contains
code fences, use a longer outer fence so the nested code remains intact.
Place material unknowns and readiness or template conflicts after the body as
separate notes. No shape here adds a validation section or command checklist.
