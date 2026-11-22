---
name: principles
description: "Engineering principles from pstack, steered by name. Use when the user names a principle (\"apply prove it works\", \"subtract before you add\") or asks which principles apply to a task."
---

# Principles

Each principle is a complete rule in
[`references/principles.md`](references/principles.md), under a heading with
its name. The name is the handle: when the user says one, read its section and
apply it.

1. Match the task to the index below. Take every principle the user named,
   plus each one whose trigger the task meets.
2. Read those sections in `references/principles.md`.
3. Apply them. In the reply, name each applied principle and the decision it
   changed. A principle with no changed decision was not applied; leave it out.

## Index

Core: how much to build and when to rethink the design.

- Laziness Protocol: diff size, new abstractions or layers.
- Foundational Thinking: core types and data shape before logic.
- Redesign From First Principles: a new requirement in an existing design.
- Attack the Premise: two or more failed fixes that share one premise.
- Subtract Before You Add: an addition, refactor, or rewrite on dead weight.
- Minimize Reader Load: code that is hard to trace.
- Outcome-Oriented Execution: planned rewrites and migrations with phases.
- Experience First: product, UX, or scope tradeoffs.
- Exhaust the Design Space: a novel decision with no precedent.
- Build the Lever: any non-trivial edit, migration, analysis, or check.

Architecture: where state, validation, and compatibility live.

- Model the Domain: stateful logic, growing branches, repeated shape checks.
- Boundary Discipline: validation, error handling, framework adapters.
- Type System Discipline: types and signatures in a typed language.
- Make Operations Idempotent: commands and loops that retry or restart.
- Migrate Callers Then Delete Legacy APIs: a new internal API beside an old one.
- Separate Before Serializing Shared State: concurrent writers to one target.

Verification: what counts as proof.

- Prove It Works: before declaring done.
- Fix Root Causes: debugging.
- Sequence work into verifiable units: multi-step work, commit and PR order.
- Test Behavior, Not Implementation: writing, changing, or keeping a test.
- Explain the Number: measuring, or trusting a measured number.

Delegation: parallel work.

- Guard the Context Window: large outputs, long files, fan-out.
- Never Block on the Human: the urge to ask "should I do X?" on reversible work.

Meta.

- Encode Lessons in Structure: the same instruction or correction a second time.
