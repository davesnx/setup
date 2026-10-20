---
name: create-drafted-blog-post
description: "Interview the author and develop blog topics or notes into headings and bullet-point outlines. Iterate on the story, argument, evidence, and conclusion."
---

# Create a drafted blog post

Build the post's structure with the author. The output is a working outline of
headings and bullet-point notes (the author's “dotted lines”), not finished prose.
The story, evidence, and conclusion must fit before sentences are polished.

## 1. Read and interview

Read the supplied material, relevant `VOICE.md` if present, and supplied or clearly
identified author samples before asking questions. Use samples to understand how
the author develops ideas, not just their vocabulary. Their absence is not a blocker.
Keep raw notes and transcripts unchanged. Follow the requested output location,
including chat. For file output, use an existing outline as the working file when
supplied; otherwise ask once where to save it before creating a file.

Read [references/interview.md](references/interview.md). Interview in short rounds,
using the answers already available. Start with the reader, what they know,
the point the author wants to make, and the experience or evidence behind it.
Invite shorthand answers and unstructured notes. Ask follow-ups about gaps,
tradeoffs, and what the reader should take away.

Keep author statements, checked sources, suggestions, and open questions distinct.
An approved angle is a direction, not evidence for an event, motive, number, or
cause. Ask for missing personal details; verify external facts from sources.

This step is complete when the reader, purpose, scope, main claim, available
support, and unresolved questions are explicit. Summarize them for correction.
Unknown facts can remain marked; they cannot become implied answers.
When the author asks to try an outline, show a provisional version with open
questions rather than requiring a separate approval of this summary first.

## 2. Choose the story

Read [references/structures.md](references/structures.md) when choosing or changing
the section order. Use the form that fits the material rather than filling a template.

When the direction is open, offer 2–3 angles as a possible title, opening point,
and ending point in bullets. Explain what each would require from the material.
Let the author choose or combine them. Reuse a direction they already selected.

Choose an order that serves the argument: a story, explanation, tutorial,
comparison, or another form the material supports. A story need not have a
success or a dramatic turning point. Its ending can be a limited or mixed result.
Start from the author's reasoning and sequence. Propose a different order only
when it solves an identified reader problem; a familiar template is not a reason.

The direction is agreed when the author accepts the central point, the opening's
promise, and what the conclusion can honestly say. A provisional scaffold can help
them decide; distinguish its proposals from confirmed choices.

## 3. Iterate the scaffold

Write headings with short bullets beneath them. Adapt this shape to the post:

```markdown
# Working title

- Reader: …
- Reader already knows: …
- Main point: …

## Opening
- Situation or question that starts the post
- What the reader will get

## [Descriptive section heading]
- Point this section adds
- Evidence or example, with its source
- Concept to introduce before the next section needs it
- [Q: Missing fact or author decision]

## Conclusion
- What the body supports
- Limits, consequence, or next step
```

Start with the most uncertain section or the one carrying the main argument.
Ask what the reader needs next, then propose the next section or a targeted
change. Explain why it belongs there. Ask what to keep, cut, move, or combine.
Record agreed changes immediately in the chosen output. For file edits, reread
the file first to preserve the author's changes. Keep the rest of the outline intact.

Track which concepts the reader brings and which sections introduce new ones.
Introduce an idea before relying on it, including its term when it has one.
Record possible art or code as brief placeholders tied to a reader need; detailed
asset choices belong to the writing stage.

Challenge repeated sections, missing steps, and conclusions stronger than the
evidence. If a section needs material that is absent, name the gap and ask for it,
reduce the claim, or propose cutting the section. Never invent an answer.

## Collection mode

If the author asks only to collect notes or think aloud, retain their material
and corrections across turns. Reply briefly, with optional questions where useful.
Wait for a request to arrange or revise before changing the outline. A one-off
outline request does not turn later notes into edit requests; resume collection
unless ongoing updates were requested. Keep tentative interpretations labelled
as suggestions, and let the author choose their importance.

## Completion and handoff

The outline is ready when the author accepts the order, each section has a
distinct purpose, the conclusion follows from the body, and every known gap is
visible. The author decides when to stop iterating. An outline with gaps can be
handed off, with those gaps still marked.

Offer `write-polish-blog-post` to turn the agreed scaffold into prose. Stop at the
outline unless the author requests that next stage. Use `critique-blog-post` when
the requested result is a review of an existing outline or post.

## Sources

Interview and collection practices adapt the former local blog-writing skills,
Anthropic's `doc-coauthoring`,
[kdy1's blog workflow](https://github.com/kdy1/kdy1-scripts/blob/f9079364d84a9d3e1eaa1c8b8c9dbc60ee4e46de/skills/write-blog-post/SKILL.md),
and [compound-writing](https://github.com/everyinc/compound-writing) (MIT).
