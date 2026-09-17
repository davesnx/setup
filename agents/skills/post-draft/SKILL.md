---
name: post-draft
description: Finish sancho.dev drafts with stub, outline, or partial SKILLS state. Fill gaps from evidence and ask for missing author decisions; supports post interviews.
---

# Post draft

Finish a draft by mapping its gaps, finding evidence, and asking the author
only for unresolved decisions. Write supported material into the post.
Read `VOICE.md` at the repository root and the draft. Use the voice
guide's relevant examples in context, not as a formula for every post.

## Gaps

Read the draft, its SKILLS block, and everything it links. A **gap** is a
place where the reader is owed something the draft does not give. Find every
one:

- A sentence that breaks off, an `xxx`, a TODO checkbox, a `[Q:]`, a "TBD"
  description.
- Missing context, explanation, or a consequence needed by this post's
  reader. Judge the whole passage, not a fixed set of paragraphs or sections.
- A claim whose support is missing or too weak for its scope. Evidence can
  appear elsewhere in the post or in a linked source.
- A title or heading that promises something the passage does not address.
  A question is valid when it serves the post.
- Missing attribution or a link the reader needs to identify or check a
  person, project, or source.

Sort each gap into a fact or a decision. A **fact** lives in the
environment: the repository, the linked issue, the benchmark script, the git
history of the project the post is about. Find it yourself; use a sub-agent
when independent research can run in parallel. A **decision** lives in the
author's head: what happened, what it cost, what he would do differently,
which of two stances he holds. Only unresolved decisions go to the author;
reuse decisions already supplied in the conversation or his linked notes.

Done when every gap is listed with its location, its type, and, for a fact,
where you will look.

## Rounds

Work unresolved decisions in rounds, or use interviews when requested. If
existing evidence resolves a gap, proceed to Writing without an interview.
The **frontier** is every decision whose prerequisites are settled. Ask the
whole frontier at once, numbered:

```
**Q1** - **<gap, with the line or heading it sits under>**: <what the reader is owed there, and the question that gets it>

Guess: <a tentative answer for him to confirm or correct, using only known context>
```

Include a guess only when known context supports one; otherwise ask the
question without inventing an experience or stance. A guess gives him
something to correct instead of a blank. Say once that shorthand, links, and
a pasted terminal session are welcome answers. Ask in prose, never with a
form: the answers are anecdotes and numbers, not options.

Each round's answers reshape the gap list. A "no" opens new questions. A
link opens a fact to look up. Recompute the frontier and ask again.

The interview is complete when no material gap needs an author answer.
If an answer or source remains unavailable, write the supported parts first,
then pause with explicit outstanding questions and the source or author input
needed. An empty frontier alone does not mean the draft is complete:
unresolved facts can still block it.

## Writing

Write resolved gaps into the draft as soon as confirmed answers or linked
evidence support them, at the spot each belongs and nowhere else. No separate
permission or answered interview round is needed. Do not invent an interview
history to justify writing. Write supported parts even if other gaps remain.

- Use the answer's own nouns and verbs, with enough context and evidence for
  the reader. Choose sentence and paragraph structure for this passage.
  Remove verbal hesitation only when it carries no meaning. Preserve
  qualifications about uncertainty, scope, or
  frequency, such as "might", "in my case", and "usually".
- Check each addition against its confirmed answer or source and the
  relevant VOICE.md examples. Keep source authors' experiences and opinions
  separate from his.
- Keep unavailable evidence explicit with `[Q: ...]`, stating what is
  missing and where to obtain it. A promised answer is not evidence.
- Update the SKILLS block: `state:` to stub, outline, partial or
  full-draft; `next:` to the first open gap, or to the sanding pass once
  none remain.

Show him the written passages, not the whole file.

Partial work is done for now when supported additions are written, unresolved
gaps remain explicit, and the SKILLS block reads `state: partial` with `next:`
pointing to the first outstanding question or evidence needed.

Set `state: full-draft` only when material gaps are resolved, the post meets
its reader promise, and no unfinished text or unanswered `[Q:]` remains.
Then set `next: unslop with its references/author-patterns.md, then the
write-blog-post reader test`. A supported uncertain or mixed result can be complete;
do not manufacture a conclusion to close the draft.

## Rules

- Facts are yours to find. Decisions are his to make. Ask nothing you can
  look up.
- A guess stays labelled a guess until he confirms it. Only confirmed
  answers and found facts enter the draft.
- Write from confirmed answers or found evidence, not from unconfirmed guesses.
