# Upstream source

- Repository: https://github.com/backnotprop/plannotator
- Source: https://github.com/backnotprop/plannotator/blob/v0.27.12/apps/skills/core/plannotator-last/SKILL.md
- Revision: v0.27.12 (`96313ab228ede843203d38d9d2a86e1c87e18c81`)
- Vendored: September 4, 2026
- License: MIT OR Apache-2.0 (repository `LICENSE-MIT` and `LICENSE-APACHE`)

The Plannotator installer (`curl -fsSL https://plannotator.ai/install.sh | bash`) writes `apps/skills/claude/plannotator-last` to `~/.claude/skills` and then `apps/skills/core/plannotator-last` to `~/.agents/skills`. Both paths link to this repository's `skills/` directory, so the `core` copy is the one on disk.

No local changes.
