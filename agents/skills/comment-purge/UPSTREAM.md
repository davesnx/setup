# Upstream

- Repository: https://github.com/cursor/plugins
- Source: https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/no-comments/SKILL.md
- Companion agent: https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/agents/comment-sicko.md
- Revision: `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`
- Adapted: September 7 2026
- License: MIT. `LICENSE` is an exact copy of upstream `pstack/LICENSE`.

## Local Changes

- Renamed the skill to `comment-purge`, titled Comment Purge, without a persona.
- Inlined companion deletion and review rules; replaced host-specific tools,
  agent types, and skill calls with a tool-neutral workflow and separate-pass fallback.
- Kept `disable-model-invocation: true` and required an explicit cleanup request
  in the description for hosts that ignore the field.
- Preserved aggressive deletion, default diff scope, evidence-based exceptions,
  root-cause fixes, and approval before constraint encoding.
- Made functional directive protection, existing-change protection, bounded
  correction, repository checks, and final diff review explicit.
