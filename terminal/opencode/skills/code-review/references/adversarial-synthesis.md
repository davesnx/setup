# Adversarial Synthesis And Lead Judgment

Adversarial review produces candidate findings. Verify, filter, and decide from
evidence. Independent reviewers can challenge assumptions, but votes do not
establish truth. In a direct review, apply the lead judgment below to the
competing explanations you tested.

## Agreement Map

Use this only when independent reviewers contributed. No reviewer count or
agreement entry is required for a direct review.

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
- Prefer a short, useful verdict over a padded list. Zero findings are valid;
  omit empty judgment groups rather than filling a report template.

Classify each candidate:

- **Act On**: Confirmed correctness, security, specification, or maintainability issues that should block the change.
- **Consider**: Valid concerns for which impact, timing, or remedy cost does not clearly justify blocking.
- **Dismissed**: Incorrect, unreachable, preference-only, duplicated, or cleared by stronger context. Give the reason so the user can challenge the decision.

For each material retained or dismissed candidate, cite confirming or clearing
evidence and name the contributing reviewers when present. Keep the decision
without forcing a separate category or listing every discarded style suggestion.
