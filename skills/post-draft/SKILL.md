---
name: post-draft
description: Fill the gaps in a sancho.dev blog draft by interviewing the author in rounds, then writing the missing prose into the draft using VOICE.md as the style guide. Use when a draft under src/content/ has a SKILLS block with state stub, outline or partial, or when the user asks to finish a draft, fill what is missing in a post, or be grilled about a post.
---

# Post draft

Finish a draft the way `grilling` stress-tests a plan: map the gaps, ask
the author only what only the author knows, write each answer into the
post. The standard is `VOICE.md` at the repository root. Read it whole
before the draft.

## Gaps

Read the draft, its SKILLS block, and everything it links. A **gap** is a
place where the reader is owed something the draft does not give. Find every
one:

- A sentence that breaks off, an `xxx`, a TODO checkbox, a `[Q:]`, a "TBD"
  description.
- A step of VOICE.md "Shape of a post" that is absent. Steps 1, 3 and 8 are
  always owed.
- A claim with no number, file, command, name or anecdote in its paragraph.
- A title or heading that asks a question instead of taking a stance.
- A person or project named without a link.

Sort each gap into a fact or a decision. A **fact** lives in the
environment: the repository, the linked issue, the benchmark script, the git
history of the project the post is about. Find it yourself, with a sub-agent
when it takes more than one lookup. A **decision** lives in the author's
head: what happened, what it cost, what he would do differently, which of
two stances he holds. Only decisions go to the author.

Done when every gap is listed with its location, its type, and, for a fact,
where you will look.

## Rounds

Work the decisions in rounds. The **frontier** is every decision whose
prerequisites are settled. Ask the whole frontier at once, numbered:

```
**Q1** - **<gap, with the line or heading it sits under>**: <what the reader is owed there, and the question that gets it>

Guess: <the answer you would write if he said "yes", one or two sentences, in the claim shape from VOICE.md>
```

The guess is a claim for him to confirm or knock down. It gives him
something to correct instead of a blank. Say once that shorthand, links, and
a pasted terminal session are welcome answers. Ask in prose, never with a
form: the answers are anecdotes and numbers, not options.

Each round's answers reshape the gap list. A "no" opens new questions. A
link opens a fact to look up. Recompute the frontier and ask again.

Done when the frontier is empty: nothing the reader is owed depends on an
answer not yet given.

## Writing

After each answered round, write the answered gaps into the draft at the
spot each belongs, and nowhere else.

- Turn each answer into VOICE.md "Claim shape": one claim, a concrete noun,
  the reversal or consequence, the shortest sentence last. His answer's own
  nouns and verbs are the raw material. Remove verbal hesitation only when it
  carries no meaning. Preserve qualifications about uncertainty, scope, or
  frequency, such as "might", "in my case", and "usually".
- Hold every new paragraph to VOICE.md "The bar" and "Body".
- Follow VOICE.md "Filling gaps" for anything he promised and did not give.
- Update the SKILLS block: `state:` to stub, outline, partial or
  full-draft; `next:` to the first open gap, or to the sanding pass once
  none remain.

Show him the written passages, not the whole file.

Done when the draft reads from title to closer with no break, no `xxx`, no
TODO, every `[Q:]` names a fact he still owes, and the SKILLS block reads
`state: full-draft` with `next: unslop with its references/author-patterns.md,
then the blog-post reader test`.

## Rules

- Facts are yours to find. Decisions are his to make. Ask nothing you can
  look up.
- A guess stays labelled a guess until he confirms it. Only confirmed
  answers and found facts enter the draft.
- Prose is written after a round is answered, never before.
