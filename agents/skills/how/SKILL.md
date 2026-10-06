---
name: how
description: Explain or research how something works, in this codebase or outside it, by exploring code or primary sources and producing a clear, sourced explanation. Use for "how does X work", "research X", "trace X", or "where is X used" — X can be local code or an external topic, such as a library, API, other repo, or knowledge base. Optionally critique the architecture for issues.
---

# How

Explain enough of the system for the reader to follow its behavior and find the
relevant code. For a question about an external topic, explain it from primary
sources instead, with a source on each claim. This is read-only work unless the
user separately asks for edits.

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

## Research outside the codebase

Some questions point outside this repository: a third-party library, an API,
another repo, or a knowledge base.

1. For a remote git repo, use the librarian skill for a local cached checkout,
   then trace it like local code.
2. For docs, APIs, specs, and knowledge bases, read the primary source itself,
   not a secondary write-up of it. Follow each claim back to the page or file
   that states it.
3. Give each claim a source: a URL, a file path, or a doc section. A caller
   that records findings on a ticket, such as wayfinder, needs that source on
   each line it keeps.
4. Stop when the claims the question needs are covered, or name what you could
   not verify.

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
