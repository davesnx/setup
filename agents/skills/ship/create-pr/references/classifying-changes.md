# Choosing Depth

Use the default body in [the main skill](../SKILL.md). These examples help
decide how much explanation its optional parts need; they are not body templates
or labels to put in a PR.

| Change | Useful depth |
| --- | --- |
| Narrow correction | Problem/outcome, evidence for any behavioral claims, and risk can be the entire body. |
| Bounded feature or local refactor | Add the non-obvious mechanism or chosen tradeoff, perhaps a usage example. |
| Difficult or high-risk change | Connect context, constraint, chosen design, and consequence; use sections when the reasoning needs them. |

A ten-line migration may need more explanation than a generated refresh across
many files. Several files can implement one simple idea. Depth follows the
consequences and the reasoning a future reviewer needs, not line count.

## Questions That Expose Missing Context

| Area | What does the reviewer need to judge? |
| --- | --- |
| Security or privacy | Which trust boundary changes? What happens on failure? What can be stated under the repository's disclosure rules? |
| Stored data | Can old and new readers/writers coexist? What is the operation order, partial-failure behavior, and recovery path? |
| Public contract | Which usage changes? What versioning, deprecation, or transition behavior applies? |
| Concurrency | Who owns retries and cancellation? Which ordering, idempotency, and recovery invariants hold? |
| Deployment | What compatibility window, operator action, or rollback precondition matters? |
| Performance | Which mechanism explains the measured result, and which workload limits the conclusion? |
| Visual impact | Which states change directly or indirectly, and which scenarios expose those effects? |

These areas do not determine the risk category by themselves; use the main
skill's door definitions against actual effects. Follow its draft disclosure
rule for incomplete behavior and requested feedback. Draft status does not
change the publication gate.
