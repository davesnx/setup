# Research Basis

These references were written for the `write-pr-body` skill, which merged into
`create-pr` on 2026-09-17. Step 4 of [the main skill](../SKILL.md) now holds the
writing rules.

## Attribution

### Change records

This adapts the rationale in the upstream
[writing-change-records](https://github.com/thesammykins/skills/tree/eec746ff24516acb5c7bd7352dcb739c03886afe/skills/writing-change-records)
skill. The external sources below were cited by upstream;
they were not independently read or verified during this integration. Treat the
support descriptions as upstream rationale, not new research findings.

### Sketches

The sketch rules adapt, in original wording, the
[show-me](https://github.com/humanlayer/skills/blob/3c2629142c5d437428269b1b722b08c0b87f574d/plugins/show-me/skills/show-me/SKILL.md)
skill by HumanLayer (Dex Horthy), MIT license, read at that revision on
2026-09-17. Adopted: the smallest view that makes the key point clear; pseudocode,
call tree, component tree, shallow file tree, and Mermaid as the view shapes;
a `diff` of a shape when the surroundings already exist and the whole block when
most of it is new; each visual beside the text it supports; one or a few views,
rarely all. Not adopted: focused HTML artifacts, which a PR body cannot carry.

### Domain language

The vocabulary rule reads the `CONTEXT.md` glossary that the local
`domain-modeling` skill maintains, the same glossary the `grilling` skill keeps
in its "grill with docs" mode. Reading the glossary does not load that skill.

### Merge risk

The two-way and one-way door framing is Jeff Bezos's Type 1 and Type 2
decisions from the 2015 Amazon shareholder letter, applied here to what a
revert of the merge can and cannot restore. The letter was not re-read for
this integration.

### Evidence

Evidence in the body is a user requirement from 2026-09-17. It replaces the
earlier rule that kept every test and check report out of the body. Routine
readiness results still stay in the user-facing report.

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
record, domain terms from the glossary, sketches and relevant code, evidence of
the changed behavior in the body with routine readiness results outside it,
uploaded visual comparisons, measured benchmark tables, the one-line merge-risk
statement, and the threshold for long-form explanation. These are preferences
and safety constraints, not empirical claims attributed to the sources above.

[My pull requests](my-pull-requests.md) records six user-selected bodies actually
read with `gh`. They support observations about short bullets, informal context,
code/output examples, and one longer problem-to-approach explanation. None shows
Mermaid, uploaded before/after media, benchmark tables, or a risk line. Those
requirements come from the user, not from extrapolating the old examples.

For future changes, identify whether a rule comes from a user requirement, an
observed example, or an external source. Verify external claims before presenting
them as independently established research; preserve the distinction on update.
