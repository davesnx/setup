---
name: domain-modeling
description: Use for explicit domain modeling, ubiquitous language, glossary or CONTEXT.md, context maps, or ADR work. Not for TDD, test-first, red-green-refactor, or integration tests alone. Load tdd too only when test-first work is explicitly requested.
---

# Domain Modeling

Use this skill to change the project's domain model or record its language and decisions. Merely reading existing domain terms while doing other work does not require this skill.

## Modes

- **Model and language**: Sharpen concepts, invariants, scenarios, and ubiquitous language. Read [references/domain-modeling.md](references/domain-modeling.md) before starting.
- **Glossary and contexts**: Create or update `CONTEXT.md` and `CONTEXT-MAP.md` as domain language and context boundaries become clear. Use [references/context-format.md](references/context-format.md).
- **Decision record**: Create or update an ADR when the user asks for ADR work or a decision meets the qualification bar. Use [references/adr-format.md](references/adr-format.md).

Use TDD only as separate support when the user also asks to drive implementation test-first. Domain scenarios can clarify examples without starting a red-green-refactor loop.
