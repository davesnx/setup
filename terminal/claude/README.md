# Claude Code setup

Claude Code settings, hooks, and status line.

## Install

```sh
./terminal/claude/install.sh
./terminal/claude/install.sh local
./terminal/claude/install.sh ssh
```

The profile argument is optional. Without it, the script picks `ssh` when
`SSH_CONNECTION` is set, otherwise `local`.

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
- `hooks/auto-improve.py` links to `~/.claude/hooks/auto-improve.py` only
  when that path is missing or already links to this file. A foreign file at
  that path makes the installer refuse and exit with status 73, rather than
  overwrite it.

Existing files at any other link target move to a timestamped directory under
`~/.local/state/setup/backups` before the new link is created.

When the `claude` command is on `PATH`, the installer also registers a
user-scope Chrome DevTools MCP server, matching the profile:

- `ssh`: connects to `--browser-url=http://127.0.0.1:9222`.
- `local`: launches Brave with a persistent profile under
  `~/.cache/chrome-devtools-mcp/brave-profile`.

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

Run the Python test suite from the repository root:

```sh
python3 -m unittest discover -s terminal/claude/tests -p 'test_*.py' -v
```
