# Classifying Changes

Choose the shortest explanation that preserves the reasoning needed to judge
the final change. Classification guides drafting; keep the label out of the body.

## Decide By Consequence

- How much context is needed to understand the outcome?
- Which invariant, design choice, or caller contract changes?
- Which users, services, stored data, or operators are affected?
- Can a failure be reversed? Does deployment order affect safety?
- Would omitted reasoning make the chosen design hard to maintain?

Risk can justify detail in a small diff. A large generated refresh can need only
a few bullets about its source, purpose, and resulting change. Line count is not
a depth rule, and PR line-count reduction is not the outcome to describe.

## Quick

- Use for a narrow correction with established intent and low consequences.
- State the prior problem and resulting behavior in concise bullets.
- Skip design, architecture, and risk sections that add no information.

## Standard

- Use for a bounded feature, meaningful local refactor, or understood bug.
- Explain the result and any non-obvious mechanism or chosen tradeoff.
- Add a concrete usage or internal code example when it reduces explanation.
- Several files can implement one simple idea; avoid a file inventory.

## Deep

Truly difficult, broad, or high-risk work may need technical-blog depth. Build
the explanation from context to constraint, chosen design, and consequence.
Short sections, bullets, actual snippets, and relevant diagrams can carry most
of it. Use connected prose only where the reasoning needs it. Do not turn every
feature into a design essay or manufacture impressive scope.

Include the applicable facts, not a fixed set of headings:

| Risk | Reasoning worth preserving |
| --- | --- |
| Security or privacy | Trust boundary, failure behavior, caller impact; respect private disclosure rules |
| Stored data | Old/new reader and writer compatibility, operation order, partial failure, rollback preconditions |
| Public contract | Changed usage, versioning, deprecation, transition behavior |
| Concurrency | Ordering, cancellation, retry ownership, idempotency, recovery invariants |
| Deployment | Compatibility window, flags, operator action, safe rollback conditions |
| Performance | Mechanism and measured target-branch/PR comparison; use the benchmark rules in the main skill |
| Broad visual impact | Affected states and real uploaded baseline/candidate comparisons, including indirect effects |

Describe substantive chosen design tradeoffs, not abandoned implementation steps.
Keep operational instructions that are part of the delivered behavior distinct
from validation reporting, which belongs outside the body.

## Drafts And Mixed Scope

- A draft can be any depth. State intentionally incomplete product behavior and
  useful design feedback in the body when relevant to the current aggregate diff.
- Keep missing checks and evidence requests in separate notes. Draft status does
  not excuse invented facts or comparisons.
- If no coherent outcome covers the changes, flag the scope issue outside the
  body. Do not change commits, split the branch, or hide unrelated work in prose.
