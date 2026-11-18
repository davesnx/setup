---
name: design-walk
description: Discuss a design with the user and test the discussion with small prototypes, until the design is solid and coherent. Use for "let's design X", "explore this design", "prototype this idea", "find the limits of this design". Not for production implementation; not for decision tickets (use wayfinder); not for one question answered by several agents (use council).
---

# Design walk

A conversation about a design. The user leads. When a point can be shown
faster than argued, build a small prototype, run it, and continue the
conversation with the result.

## What exists

- One file: `.workplace/plans/<slug>_DECISIONS.md`. A numbered list. Each
  entry is one sentence, the date, and the evidence that supports it (a
  prototype result, a measurement, or "user choice"). Nothing else is
  required.
- Prototypes, in the form the point needs: a branch of the library in a
  worktree, a script, a migration of some real files, a test in the
  consumer project. They are throwaway. No fixed layout.

## How to talk

1. Discuss approaches, not questionnaires. Give your view and the strongest
   argument against it. At most one question per reply, and only when the
   answer is the user's to give.
2. Disagree when the evidence disagrees. Say what result would change your
   mind.
3. When an approach is on the table, name the cheapest prototype that can
   prove it wrong, and build it. Report what ran and what it showed, not
   what it should show.
4. Prefer the real thing over a model of it: the real library, real consumer
   code, a real browser, real compressed bytes.
5. Look for the limit of each approach: the input where it breaks, and the
   cost at that point as a number. A design with no known limit is not yet
   explored.

## Decisions

6. Write a decision when the user makes one. Do not write your own proposal
   as a decision.
7. Before you add a decision, read the list. When the new one conflicts with
   an earlier one, say which, and let the user choose. Replace the loser; do
   not keep both.
8. When a prototype result contradicts a decision, say so at once and mark
   the decision as open again.

## Prototypes

These rules also govern Prototype tickets in wayfinder; there the ticket
resolution records the result instead of the decision list.

9. Small: one question for each prototype. When it has answered, record the
   result under the decision it supports and leave the code where it is.
10. A prototype that grows into the real implementation is a good outcome.
    Say when that point is reached, so the user can move it to a real
    branch.
11. Subagents can build prototypes in parallel. The conversation and the
    decision list stay with the top-level session.

## End

The walk ends when the user says the design holds together. The output is
the decision list and the prototypes that support it.
