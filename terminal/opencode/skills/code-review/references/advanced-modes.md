# Advanced Review Modes

Read this file for Deep or Adversarial / Multi-model review, or when separate
risks justify independent investigation. The scope, coverage, verification,
reporting, and authorization rules in [Code Review](../SKILL.md) still apply.

## Shared Parallel Pass

Select useful jobs, not a fixed reviewer count:

1. A correctness and security reviewer using [correctness and security](correctness-security.md).
2. A maintainability reviewer using [maintainability](maintainability.md).
3. A standards reviewer using the Standards section of [standards and spec](standards-spec.md).
4. A spec reviewer using the Spec section of [standards and spec](standards-spec.md); skip it when no spec exists.

Give each reviewer the same diff command, commit list, and intent, plus context
paths and reference details for its primary lens. Additional references require
a relevant risk; do not require every child to load all four. Permit critical
cross-lens findings. Ask for prioritized findings with `file:line`, an execution
path, impact, concrete remedy, and proof or missing evidence. Require high
conviction and no cosmetic padding. Reviewers must not edit, publish, or perform
Git writes. Further delegation needs a genuine separate question.

Run selected independent jobs in one parallel batch. Deep and Adversarial modes
share this pass; do not launch a second group for an Adversarial request. If jobs
are unavailable in either mode, state the limit and perform the Standard lead
review. Preserve actual reviewer evidence; do not invent jobs or results.

For Adversarial mode, select different available models when the agent runner
supports model selection. Do not name or depend on hard-coded model IDs. If model
selection is unavailable, use the same independent read-only jobs without
selecting models. State in the final review that run independence, not confirmed
model diversity, supplied the adversarial signal. Never invent model identities.

## Deep Synthesis

When results return, deduplicate them and resolve disagreements with direct
repository evidence. Agreement raises confidence but does not replace
verification. Apply the [blast-radius lens](blast-radius.md) yourself and run
the cheapest proof that can falsify the highest-risk safety claim.

## Adversarial Synthesis

Read [Adversarial synthesis and lead judgment](adversarial-synthesis.md). Build
the agreement map before deciding the verdict. Treat consensus as a reason to
verify a claim first, not as proof. Investigate lone correctness or security
findings on their merits. Resolve explicit disagreements with repository
evidence and state any disagreement that remains unresolved.

Act as the lead reviewer, not a vote counter. Put every candidate finding in
**Act On**, **Consider**, or **Dismissed**, with a short reason and the reviewers
that raised it. Do not auto-apply any suggestion.
