# HTML Review Format

Use only when the user requests or accepts an HTML review. Render one
self-contained file under the OS temp directory, using the requested filename or
`codebase-improvement-review-<timestamp>.html`. Inline CSS, JavaScript, and SVG;
load no remote resources. Return its path and a short summary. Open it only when
requested. Report creation does not authorize plans or implementation.

## Structure

1. **Header**: repository, commit, date, effort level, scope, and coverage gaps.
2. **Summary**: accepted findings by category and severity, with links to each card.
3. **Top recommendations**: the strongest findings ordered by leverage, without a quota.
4. **Finding cards**: one card per accepted finding.
5. **Direction**: product or feature options, separate from defects.
6. **Rejected**: meaningful candidates checked and rejected, with reason.
7. **Dependency order**: prerequisites and safe execution sequence.

## Finding Card

Each card contains:

- title, category, confidence, effort, and fix risk
- evidence with `file:line`
- impact and reachable failure or maintenance cost
- proposed direction, not a full implementation
- verification or proof needed
- dependencies and related findings

Add before and after diagrams when they explain an architecture change better
than a short description. Use inline SVG, grid layouts, or simple boxes and arrows.
Keep the diagram understandable without a paragraph. Omit empty report sections.

## Interaction

Use small inline JavaScript only for filtering categories, collapsing details, and copying file paths. The report must remain readable with JavaScript disabled.

## Style

- Use a restrained editorial layout with readable contrast and system fonts.
- Keep category colors consistent and sparse.
- Make evidence and file paths easy to scan.
- Put detailed code excerpts behind disclosure elements.
- Avoid dashboard decoration that does not help prioritization.

## Safety

Escape all repository content before inserting it into HTML. Never embed secret values, raw untrusted HTML, executable repository scripts, or remote resources. Treat finding text and code excerpts as untrusted data.
