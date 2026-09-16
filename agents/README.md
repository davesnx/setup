# Agents

Shared agent rules and skills, used by both Claude Code and OpenCode.

## MCP servers

`mcp.json` is the single declaration of MCP servers for both tools. It uses
OpenCode's `mcp` schema, which carries `enabled` and `oauth`. Secrets stay in
the environment: write them as `{env:NAME}`. OpenCode expands that form, and
`mcp.ts` renders it as `${NAME}`, which Claude Code expands. `context7`
expects `CONTEXT7_API_KEY` this way.

- OpenCode reads it directly. `terminal/opencode/install.sh` links it to
  `~/.config/opencode/opencode.json`, and OpenCode deep-merges that file with
  `opencode.jsonc`.
- Claude Code reads its own `.mcp.json` format, so `terminal/claude/mcp.ts`
  renders the enabled servers into `terminal/claude/.mcp.json`, which
  `terminal/claude/install.sh` links to `~/.mcp.json`. Regenerate after
  editing `mcp.json`:

  ```sh
  bun terminal/claude/mcp.ts
  bun test terminal/claude/mcp.test.ts
  ```

  The test checks that the rendered file matches the source.

Both links resolve into this repository, so every MCP server either tool
loads traces back to `mcp.json`. A server that appears anywhere else came
from an external installer replacing a link. In January 2026
`npx vibeship-spawner-skills` wrote a `spawner` server into `~/.mcp.json`
that way.
