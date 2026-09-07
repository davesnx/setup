---
name: domain-modeling
description: Use only when the user explicitly asks to model a domain, establish ubiquitous language, create or update a glossary or CONTEXT.md, map contexts, or create or revise an ADR. Do not use for TDD, test-first implementation, red-green-refactor, or integration tests alone. If the user explicitly asks for both domain modeling and test-first work, load both skills.
---

# Domain Modeling

Use this skill to change the project's domain model or record its language and decisions. Merely reading existing domain terms while doing other work does not require this skill.

## Modes

- **Model and language**: Sharpen concepts, invariants, scenarios, and ubiquitous language. Read [references/domain-modeling.md](references/domain-modeling.md) before starting.
- **Glossary and contexts**: Create or update `CONTEXT.md` and `CONTEXT-MAP.md` as domain language and context boundaries become clear. Use [references/context-format.md](references/context-format.md).
- **Decision record**: Create or update an ADR when the user asks for ADR work or a decision meets the qualification bar. Use [references/adr-format.md](references/adr-format.md).

Use TDD only as separate support when the user also asks to drive implementation test-first. Domain scenarios can clarify examples without starting a red-green-refactor loop.
