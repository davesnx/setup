# Rationale template

Use this reference when a design needs a durable rationale. A small decision can
use a paragraph beside the sketch in the response or the same file. For larger
work, select the sections below that explain the decision; omit empty sections.

## Problem

*What the design must achieve and which traced callers, existing types, or supplied constraints determine the shape. Cite the evidence.*

## Usage (caller's view)

*Write usage before types. Show enough realistic calls to cover materially different paths, including errors when relevant. Derive the type sketch from those calls and reconcile differences.*

## Shape

*The recommended architecture. Data structures first; then how data flows through the signatures. Name the load-bearing decisions: which invariants are encoded in types, where validation lives, what the system deliberately does not do. Cite the principle behind each decision (e.g., `per boundary-discipline`); don't restate it.*

## Synthesis decision

*Only for a comparison: which candidate became the base and why, what was adapted, and what was rejected.*

## Tradeoffs accepted

*One bullet per tradeoff the chosen shape makes. Form: "we accept X in exchange for Y." Name anything a future reader might mistake for an oversight, including things that look like premature optimization or premature simplification.*

## Alternatives considered

*Include real contenders only, with the constraint or evidence that ruled each out. Combine with the synthesis decision when that already covers the alternatives.*

## Open questions and risks

*Things you noticed during the sketch that the human needs to weigh in on, and risks worth flagging before implementation starts. Phrase as questions, not assertions, so the human's answer is the resolution rather than a comment.*

## Next implementation step

*The first thing to build against the sketch after the Architect workflow ends. One sentence.*
