# Shapes And Examples

These shapes apply the rules in [the main skill](../SKILL.md). They are options,
not mandatory sections. The small examples below are illustrative, not evidence
for a real repository. Replace their facts with inspected facts before use.

## Quick Correction

Title: `Treat equal expiry timestamps as stale`

```markdown
- Expire cache entries when their expiry equals the current timestamp, rather
  than keeping them valid for another refresh cycle.

**Risk**: two-way door.
```

One bullet can explain both the boundary problem and the outcome. The risk line
stays; nothing else is needed.

## Bounded Change

Title: `Retry transient failures for idempotent storage writes`

````markdown
- Apply the shared retry policy to idempotent storage writes after transient
  503 responses, so timeout and backoff behavior matches other storage calls.
- Return permanent errors immediately; non-idempotent writes remain unchanged.

**Evidence** (`a1b2c3d`)

```text
$ go test ./storage -run Retry -v
--- PASS: TestRetry/transient_503_retried_three_times
--- PASS: TestRetry/permanent_404_returned_at_once
--- PASS: TestRetry/non_idempotent_write_not_retried
```

**Risk**: two-way door. Revert restores single attempts; no stored state changes.
````

The second bullet earns its place only if both constraints are true. The test
names carry the evidence; the whole log would not add anything.

## Sketches, Code, And Diagrams

Pick the smallest view that makes the key point clear, and place it next to the
bullet it supports. One or two sketches per body; rarely more.

- Logic or an algorithm: pseudocode.

  ```text
  on(lookup)
    if expiresAt > now
      return entry
    drop entry
  ```

- Runtime flow: a call tree. UI structure: a component tree with the state
  hooks and module boundaries that matter. Responsibilities or a broad
  refactor: a shallow file tree with one comment per entry.

  ```text
  handleRequest
    loadPlan            # once per request; was once per query
      parsePlan
    runQueries
  ```

- A change to a shape whose surroundings already exist: a `diff` block of that
  shape, so the reviewer sees only what moved.

  ```diff
   src/cache/
   ├── expiry.ts
  -└── store.ts
  +├── store.ts
  +└── clock.ts          # injectable clock for the boundary tests
  ```

- Interaction, control flow, or data flow between parts: a fenced `mermaid`
  block. Verify nodes and edges against the code. A one-step correction needs
  no diagram.
- Show the whole block when most of it is new, when omitted context would hide
  ownership or order, or when the reviewer needs a copyable target shape.
- Show a small actual usage or internal snippet from the final change with the
  contract needed to read it; label the language. Show old/new code only when
  both sides exist in the diff.
- Use candidate-SHA permalinks for detailed explanations; quote enough that the
  link stays supplemental.

## Evidence

Put the proof next to the claim it supports, and name the SHA it came from.

- Behavior: the command and the relevant output lines, not the whole log.
- Diagnostics: the source trigger paired with the observed output. User PR #70
  in [my pull requests](my-pull-requests.md) has this shape.
- Visual and performance changes: the comparison tables below.

A bare "tests pass" is a claim. Format, lint, and typecheck results are
readiness facts for the report, not evidence of the changed behavior. Missing
evidence is a blocker for the report, never a placeholder in the body.

## Risk Line

One line, always present, after the evidence and before any review notes.

```markdown
**Risk**: two-way door. Reverting the merge restores the old boundary; no
stored data or contract changes.
```

```markdown
**Risk**: one-way door. The migration rewrites `sessions.expires_at` in place,
so a revert keeps the new values. Rollback: run `0042-down.sql` before reverting.
```

Name the door from what a revert cannot restore, not from the diff size. A
ten-line migration is a one-way door; a thousand-line internal rename is not.

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
comparison. `gh` cannot upload attachments: hand local captures to the user,
publish without the table, and list the comparison in the readiness report.

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
cannot establish improvement. Missing baseline data belongs in the readiness
report, not a guessed cell. Do not paste this empty header into a finished body.

## Difficult Or High-Risk Change

Use only the parts needed to explain actual consequences:

- Summary: the concrete problem and final outcome.
- Context: the constraint that makes the problem difficult.
- Design: the chosen mechanism, relevant code, and a sketch if it helps.
- Tradeoffs: the costs and limits of that choice, not the author's work history.
- Compatibility or rollout: precise old/new behavior and recovery preconditions.
- Evidence and comparisons: the outputs and tables that prove the claims.
- Risk: the door, what a revert cannot restore, and the rollback path.
- Review order: where the design lives, then what follows mechanically, and the
  decision that most needs a second opinion.

This can reach technical-blog length when the reasoning warrants it. Prefer a
few connected sections over a long inventory. Preserve explicit invariants:
"old readers accept new rows during deployment" is more useful than "backward
compatible" when that is the real contract. Do not invent such a contract.

## Output Boundary

Return the title separately from the body. If a fenced Markdown body contains
code fences, use a longer outer fence so the nested code remains intact.
Material unknowns and readiness or template conflicts go in the readiness
report, or after the body as separate notes for a text-only request. Evidence
shows the changed behavior; routine check results and command checklists stay
out of the body.
