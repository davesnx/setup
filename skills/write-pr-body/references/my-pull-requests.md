# My Pull Requests

Titles, authors, and full bodies were read with `gh pr view --json
number,url,title,author,body` on 2026-09-07. All six authors are David Sancho
(`davesnx`). Excerpts below are short exact body excerpts, not summaries inferred
from titles. Grouping describes body depth; diffs were not inspected for this
style research.

Current rules in [the main skill](../SKILL.md) override these older patterns.
None of these bodies contains Mermaid, uploaded before/after media, or benchmark
tables. Those are requested new rules, not observed habits.

## Simple Bodies

### odoc #1388

- Exact title: `Support multiple inputs in markdown-generate (and html-generate)`
- Link: https://github.com/ocaml/odoc/pull/1388
- Excerpt: "would be helpful to generate markdown files from a list of odocl files."
- Excerpt: "If you prefer to not change this, I could implement a new `Main.generate`"
- Shape: two informal paragraphs, related integration link, contributor credit,
  scope extension, and a compatibility claim. No headings or code blocks.
- Keep: concise motivation and material scope. Current difference: prefer bullets
  and the final chosen behavior, not an unselected implementation option. The
  compatibility claim was observed in the prose, not independently verified.

### server-reason-react #92

- Exact title: `Align with reason-react`
- Link: https://github.com/ml-in-barcelona/server-reason-react/pull/92
- Excerpt: "Moves React.use to React.Experimental.use"
- Excerpt: "Dummy implements useId (opening this issue https://github.com/ml-in-barcelona/server-reason-react/issues/93)"
- Shape: six bullets, some only API names, with issue links beside affected APIs.
  No introduction, headings, or code blocks.
- Keep: compact related changes and honest limitations. Current difference: give
  enough behavior that an API name alone does not leave the outcome unclear.

### server-reason-react #74

- Exact title: `Support mel.raw ` (the stored title has one trailing space).
- Link: https://github.com/ml-in-barcelona/server-reason-react/pull/74
- Excerpt: "It only allows to run mel.raw expressions inside browser_only functions"
- Excerpt: "(currently browser_only functions don't propagate the alert, but it should be done in the future)"
- Shape: four bullets about transformation, allowed usage, and limitations;
  includes an inline old/new code comparison with inconsistent backticks.
- Keep: concrete behavior and constraints. Current difference: use properly fenced
  code when clearer, and keep speculative future work separate from the outcome.

### server-reason-react #71

- Exact title: `melange_native_ppx grows!`
- Link: https://github.com/ml-in-barcelona/server-reason-react/pull/71
- Excerpt: "Fixes #37" (the entire body except its trailing space).
- Shape: issue link only. The body does not establish what changed; do not infer
  an implementation from the title.
- Current difference: keep the issue link but add self-contained outcome bullets.
  This is a reference for brevity, not sufficient explanatory content.

### server-reason-react #70

- Exact title: `Improve browser_only logging`
- Link: https://github.com/ml-in-barcelona/server-reason-react/pull/70
- Excerpt: "Adds a better mechanism for printing the function names"
- Excerpt: "The output when you run client code on the server is the following:"
- Shape: link to an earlier PR, three bullets, a source trigger, then diagnostic
  output with the callstack and fatal exception in two unlabelled code fences.
- Keep: concise bullets plus a concrete source/output demonstration. This is
  behavior output, not a test report. Current difference: language-label snippets,
  trim irrelevant output, and explain the final change without relying on the
  earlier PR. It is not an uploaded visual comparison.

## Complex Body

### odoc #1341

- Exact title: `Markdown output`
- Link: https://github.com/ocaml/odoc/pull/1341
- Excerpt: "This works reasonably well, but creates a big barrier between the documentation sites:"
- Excerpt: "I forked the HTML backend into a `markdown2`, removed what's unnecessary, and implemented Markdown construction with cmarkit."
- Shape: greeting and personal context, then Why, How, Notes about implementation,
  Example, and Future work. Concrete documentation-site problems lead to the
  approach, constraints, and open questions. The example links another PR.
- Keep: problem-to-approach structure for work that warrants deeper explanation.
  Current difference: remove apologetic framing, implementation chronology,
  speculative roadmap, and the paragraph reporting cram testing. Describe the
  final design and chosen tradeoffs instead. Reserve this length for genuine
  difficulty and consequences, not every new feature.
- Media observation: video/audio support is discussed, but no media is uploaded
  in the body. There are no code blocks, diagrams, or benchmark tables.

## Compact Reference Outline

- Simple API list: #92; behavior and limits: #74; brief motivation: #1388.
- Small code and output demonstration: #70.
- Too little standalone context: #71; add the actual outcome.
- Difficult change: #1341's problem, approach, and constraints, with the current
  depth threshold and reporting exclusions applied.
- New visual or performance requirements: use the comparison rules and shapes
  in [writing pull requests](writing-pull-requests.md), not these older bodies.
