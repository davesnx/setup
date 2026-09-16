# Upstream source

- Repository: https://github.com/microsoft/playwright-cli
- Source: the `.claude/skills/playwright-cli/` directory that `playwright-cli install --skills` writes, generated from playwright-core `lib/tools/skills/playwright-cli/`
- Revision: @playwright/cli 0.1.19, playwright-core 1.63.0-alpha-2026-08-31
- Vendored: September 7, 2026
- License: Apache-2.0

## Local changes

- 2026-09-07: added Brave CDP guidance and a Brave-aware description.
- 2026-09-14: reduced [SKILL.md](SKILL.md) to a task router with common safety,
  ownership, targeting, and completion rules. Moved the command catalog and
  examples to [browser commands](references/browser-commands.md). Routine
  attach/open, inspection, actions, and cleanup stay in the root; load the
  catalog only for missing commands/options. Brave recovery and advanced
  sessions stay in [session management](references/session-management.md).
  Replaced global cleanup examples with task-scoped cleanup.

For an approved upstream refresh, generate skills in an empty directory with
`playwright-cli install --skills`, then compare the generated
`.claude/skills/playwright-cli/` files with this directory. Preserve these local
changes and all scoped references; do not overwrite the router with the
upstream command catalog.
