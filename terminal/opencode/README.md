# OpenCode setup

Shared OpenCode settings and agent skills.

## Install

Clone this repository, then select the profile for the machine:

```sh
./terminal/opencode/install.sh local
./terminal/opencode/install.sh ssh
```

The script links the tracked OpenCode files into `~/.config/opencode`. Shared
skills live in the repository-level `skills/` directory, linked to
`~/.agents/skills` and `~/.claude/skills`; OpenCode, Claude Code, Codex, and the
`skills` CLI all read those two locations. Skills that exist only for OpenCode
(currently `simplify` and `code-review`, because Claude Code ships its own
`/simplify` and `/code-review`) live in `terminal/opencode/skills/`, linked to
`~/.config/opencode/skills`, which only OpenCode reads. Existing files move to a
timestamped directory under `~/.local/state/setup/backups`.

The global `AGENTS.md` file is also linked to both
`~/.config/opencode/AGENTS.md` and `~/.agents/AGENTS.md`.

The shell configuration exports `OPENCODE_CONFIG` when the selected
`host.jsonc` link exists. Start a new shell after installation.

## Browser tools

The local profile starts Chrome DevTools MCP with a persistent Brave profile.
Playwriter uses its standard local relay on `127.0.0.1:19988` and the Brave
extension.

The SSH profile connects Chrome DevTools and Playwriter directly to Chromium's
CDP endpoint on `127.0.0.1:9222` inside the remote host.

## Eval harness

OpenCode agents run `~/.config/opencode/eval-harness` directly when an eval
harness task needs it. The harness is not loaded into interactive shell
sessions. It stores generated state under
`${XDG_STATE_HOME:-~/.local/state}/opencode/eval-harness` and uses the current
OpenAI model unless `EVAL_MODEL`, `EVAL_SMOKE_MODEL`, or `EVAL_FULL_MODEL` is
set. The wrapper removes generated sandboxes after each run. Pass `--debug` to
keep a run's sandboxes for inspection.

## Keep private

Do not add authentication state, service passwords, generated packages,
conversation memory, or machine state to this directory. In particular, keep
these files outside Git:

```text
service.json
user_profile.json
technical_memory.md
memory.instruction.md
tasks/
node_modules/
*.lock
```

Use environment variables for MCP and provider credentials. OpenCode expands
references such as `{env:OPENCODE_ANTHROPIC_API_KEY}` at run time.

## Install skills

The shell wraps global lifecycle commands for the `skills` CLI. Commands such
as `npx skills add`, `update`, `remove`, and `list` always use global scope.
The CLI writes global skills to `~/.agents/skills`, which resolves to this
repository's `skills/` directory.
