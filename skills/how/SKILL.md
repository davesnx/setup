---
name: how
description: Explain or research how something works in this codebase by exploring code and producing a clear architectural explanation. Use for "how does X work", "research X", "trace X", or "where is X used" when X refers to the current codebase. Optionally critique the architecture for issues.
---

# How

Explain enough of the system for the reader to follow its behavior and find the
relevant code. This is read-only work unless the user separately asks for edits.

## Trace the system

1. Define the scope from the question. Resolve factual uncertainty from the code;
   ask only when different interpretations would change the work.
2. Follow entry points, callers, state ownership, and failure paths across the
   relevant modules. Separate observed behavior from intended design.
3. Stop when the important path is accounted for, or name the missing evidence.

Explore directly by default. Use parallel read-only explorers only for separate
parts that justify the extra work. Give each a distinct question and use
`references/explorer-prompt.md` when delegating. Let the host configuration select
models. Synthesize the findings yourself and verify disagreements in the code.

## Explain

Lead with the answer. Describe the flow and the reasons for its boundaries,
with concrete file and symbol references. Add a package map, definitions,
diagram, or cautions only when they help the reader. Match the requested length;
a fixed set of headings is not required.

## Critique when requested

Use `references/critique-rubric.md` to inspect correctness, coupling, change cost,
and testability. Verify each concern before presenting it. Distinguish changes
worth making now, tradeoffs to consider, and claims rejected by the evidence.

For a broad or risky critique, or an explicit request for independent reviews,
give reviewers distinct concerns using `references/critic-prompt.md`. Keep the
review read-only. Report the explanation and supported findings, not a transcript
of the review process.
