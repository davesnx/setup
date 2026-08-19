# OpenCode setup

Shared OpenCode settings and agent skills.

## Install

Clone this repository, then select the profile for the machine:

```sh
./opencode/install.sh local
./opencode/install.sh ssh
```

The script links the tracked OpenCode files into `~/.config/opencode`. All
skills live in the repository-level `skills/` directory. The script links that
directory to both `~/.config/opencode/skills` and `~/.agents/skills` so OpenCode
and other compatible agents use the same source. Existing files move to a
timestamped directory under `~/.local/state/setup/backups`.

The global `AGENTS.md` file is also linked to both
`~/.config/opencode/AGENTS.md` and `~/.agents/AGENTS.md`.

The shell configuration exports `OPENCODE_CONFIG` when the selected
`host.jsonc` link exists. Start a new shell after installation.

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
