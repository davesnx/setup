# Adversarial Synthesis And Lead Judgment

Adversarial reviewers produce candidate findings. The lead reviewer must verify, filter, and decide rather than count votes.

## Agreement Map

- Merge duplicate findings before measuring agreement.
- Treat a finding raised independently by two or more reviewers as consensus. Consensus increases its verification priority, not its truth.
- Keep lone findings visible until they are checked. A lone correctness or security finding can still be the most important result.
- Record explicit disagreement when one reviewer challenges another reviewer's claim. Resolve it with callers, tests, configuration, dependency behavior, or a focused proof when possible.
- State what remains uncertain. Do not convert unresolved disagreement into a finding or silently discard it.

## Lead Judgment

Use the full conversation and repository context that individual reviewers can lack:

- Trace hypothetical failures to a reachable caller or boundary. Dismiss them when validation, types, or actual control flow prevent the path.
- Reject style preference presented as a defect unless it causes a concrete maintenance or behavior problem.
- Reject premature abstractions that add concepts without a second real use or a clear simplification.
- Account for known constraints, staged migrations, temporary scaffolding, and established repository patterns.
- Scrutinize correctness and security claims even when only one reviewer raised them.
- Prefer a short, useful verdict over a padded list. An empty **Act On** section is valid.

Classify each candidate:

- **Act On**: Confirmed correctness, security, specification, or maintainability issues that should block the change.
- **Consider**: Valid concerns for which impact, timing, or remedy cost does not clearly justify blocking.
- **Dismissed**: Incorrect, unreachable, preference-only, duplicated, or cleared by stronger context. Give the reason so the user can challenge the decision.

For each retained or dismissed finding, name the reviewers that raised it and cite the lead reviewer's confirming or clearing evidence.
