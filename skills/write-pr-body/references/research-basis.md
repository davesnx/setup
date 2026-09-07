# Research Basis

## Attribution

This adapts the rationale in the upstream
[writing-change-records](https://github.com/thesammykins/skills/tree/eec746ff24516acb5c7bd7352dcb739c03886afe/skills/writing-change-records)
skill. The external sources below were cited by upstream;
they were not independently read or verified during this integration. Treat the
support descriptions as upstream rationale, not new research findings.

## Retained Rationale

- A PR description preserves context that the diff cannot reliably retain:
  problem, outcome, constraints, chosen decisions, and consequences.
- Write for a future reader without the discussion history. Links supplement
  the explanation.
- Scale depth to review burden and consequences, not line count alone.
- Recheck the description against the final change after revisions.

The quick/standard/deep model is an adaptation of upstream's synthesis, not a
classification asserted verbatim by any one source.

## Sources Cited By Upstream

| Source | Upstream rationale retained here |
| --- | --- |
| [Google: Writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) | Permanent record, standalone title, what and why, decisions absent from code, final-description accuracy |
| [Keavy McMinn: How to write the perfect pull request](https://github.blog/developer-skills/github/how-to-write-the-perfect-pull-request/) | Purpose, context for later readers, explicit draft state, useful feedback requests |
| [Google: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) | Coherent changes reduce the context needed to understand and reverse a change |
| [Google: Review navigation](https://google.github.io/eng-practices/review/reviewer/navigate.html) | Explain major design before local details |
| [GitHub: Issue and Pull Request templates](https://github.blog/developer-skills/github/issue-and-pull-request-templates/) | Templates prompt for missing context; they still need explicit conflict handling |
| [Sadowski et al.: Modern Code Review, ICSE 2018](https://research.google/pubs/modern-code-review-a-case-study-at-google/) | Context for lightweight review of understandable changes |
| [Bosu, Greiler, and Bird: Characteristics of Useful Code Reviews, MSR 2015](https://www.microsoft.com/en-us/research/publication/characteristics-of-useful-code-reviews-an-empirical-study-at-microsoft/) | Change and review context matters to useful feedback |
| [Gousios et al.: Work Practices and Challenges in Pull-Based Development, ICSE 2015](https://gousios.org/bibliography/GZSD15.html) | Checks and review inform contribution quality; wording does not replace those workflows |

These sources do not establish that the user's particular format is optimal.
No study sample counts or historical publication cutoff are carried forward.
Commit-only sources and rules are omitted.

## Local Rules And Observations

The user's explicit current rules govern concise bullets, the eventual squash
record, no test/CI reporting in the body, relevant code and Mermaid, uploaded
visual comparisons, measured benchmark tables, and the threshold for long-form
explanation. These are preferences and safety constraints, not empirical claims
attributed to the sources above.

[My pull requests](my-pull-requests.md) records six user-selected bodies actually
read with `gh`. They support observations about short bullets, informal context,
code/output examples, and one longer problem-to-approach explanation. None shows
Mermaid, uploaded before/after media, or benchmark tables. Those requirements
come from the user, not from extrapolating the old examples.

For future changes, identify whether a rule comes from a user requirement, an
observed example, or an external source. Verify external claims before presenting
them as independently established research; preserve the distinction on update.
