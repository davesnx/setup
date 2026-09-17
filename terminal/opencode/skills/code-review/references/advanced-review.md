# Deep And Adversarial Review

Read this for an explicit Deep or Adversarial review, or when independent
coverage justifies coordination. These modes strengthen the investigation;
they do not require a fixed team size or authorize edits.

## Deep

Trace the highest-risk behavior through callers, consumers, configuration,
stored data, and dependency behavior as applicable. Use
[blast radius and proof](blast-radius.md) for downstream safety claims. Identify
assumptions that a normal diff read could miss, then run the smallest focused
proof that can falsify the important claim. Report what was established and
what remains unproven. Do this directly when one reviewer can cover the risks.

## Adversarial

For each material candidate, seek both a failure path and the strongest reason
it may be safe: validation, an invariant, intended migration behavior, or a
caller constraint. Test the competing explanations against actual code. This
challenge is required even when the review is direct; changing the mode name
without testing assumptions does not satisfy the request.

Use [adversarial synthesis](adversarial-synthesis.md) to decide which candidates
to act on, consider, or dismiss. With independent reviewers, also reconcile
their agreement and disagreements. Without them, cite the lead's confirming or
clearing evidence without inventing agreement or reviewer identities.

## Independent Coverage

Use reviewers when explicitly requested or when distinct questions justify
their cost. For example, a data migration and an async lifecycle may need
separate investigations. Repeating one small code path under several lens names
usually adds no coverage. Explain the split when using it.

- Assign distinct questions, not a fixed roster. Give each reviewer the exact
  diff command, commit list, intent, scope, and relevant context paths.
- Give only the reference details needed for that question. Correctness and
  security, maintainability, standards, and spec are possible focuses, not
  required jobs. Missing formal specs do not remove the need to check intent.
- Require prioritized candidates with `file:line`, a reachable path or structural
  evidence, realistic impact, remedy, and proof or missing evidence. Allow
  important findings outside the primary focus, but prohibit cosmetic padding.
- Prohibit source edits, publishing, and Git writes. Further delegation needs a
  distinct question that adds coverage; it cannot repeat the same review.
- Run independent jobs together. Deep and Adversarial modes can share their
  evidence; do not start a second group just to satisfy both labels.
- Verify returned claims yourself. Deduplicate findings and resolve conflicts
  with code or focused proof; consensus affects priority, not truth.

For an explicit multi-model request, use different available models when the
runner supports selection. Do not depend on hard-coded model IDs. If only
independent runs are available, report that model diversity was not confirmed.
If reviewer jobs are unavailable, continue the requested deep or adversarial
investigation directly and state the limitation; do not claim independent review.

## Report Evidence

Include real reviewer identifiers, models when known, assigned questions, and
checked scope or evidence when reviewers contributed. Explain material consensus,
lone findings, and unresolved disagreements. Preserve lead decisions and reasons
without forcing headings, empty categories, or a row for every discarded nit.
Keep material cleared risks when they explain the verdict. A concise clean
review is valid when the evidence supports it.
