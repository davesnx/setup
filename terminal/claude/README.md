# Claude Code setup

Claude Code settings, hooks, and status line.

## Install

```sh
./terminal/claude/install.sh
```

The script links:

- `settings.json` to `~/.claude/settings.json`.
- `statusline.ts` to `~/.claude/statusline.ts`.
- `settings.local.json` to `~/.claude/settings.local.json`, only when the
  file exists in this repository. It is machine-local and Git-ignored, so
  each machine keeps its own copy.
- `agents/AGENTS.md` to `~/.claude/CLAUDE.md`.
- `agents/skills` to `~/.claude/skills`.

It also creates `~/.claude/hooks` and links two hooks with guards:

- `hooks/dcg` links to `~/.claude/hooks/dcg` only when nothing exists there
  yet. Puppet installs the real `dcg` wrapper at that path on nspawn; the
  installer never replaces it.
- `hooks/auto-improve.ts` links to `~/.claude/hooks/auto-improve.ts` only
  when that path is missing or already links to this file. A foreign file at
  that path makes the installer refuse and exit with status 73, rather than
  overwrite it.

The installer uses npm to install the hook's locked production dependencies
before creating its link. It then removes the old Python hook link only if
it points to this repository's former hook. The hook requires Node 22.18 or later.

Existing files at any other link target move to a timestamped directory under
`~/.local/state/setup/backups` before the new link is created.

Browser control uses the shared `playwright-cli` skill, not an MCP server.
`settings.json` lists `playwright-cli *` in the sandbox's excluded commands so
it can reach Brave. See [`agents/README.md`](../../agents/README.md#browser-control).

Start a new shell and restart Claude Code after installation.

Claude Code slash commands are not shipped from this repository. Shared
instructions live only as skills, under
[`agents/skills/`](../../agents/README.md).

## Model selection

`settings.json` keeps Fable 5.1 for Claude's main work. Its
`CLAUDE_CODE_SUBAGENT_MODEL=sonnet` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` settings
select Sonnet for subagents, teammates, and workflow agents, including those with
their own model overrides. The force setting requires Claude Code 2.1.257 or
later. The Sonnet alias follows the version selected by the provider.

Restart Claude Code after changing these settings.

## Automatic improvement reviews

See [`agents/README.md`](../../agents/README.md#automatic-improvement-reviews)
for the shared contract implemented by the Claude Code hook.

Run the TypeScript checks from the repository root:

```sh
npm ci --prefix terminal/claude/hooks
npm test --prefix terminal/claude/hooks
npm run typecheck --prefix terminal/claude/hooks
npm run format:check --prefix terminal/claude/hooks
```
