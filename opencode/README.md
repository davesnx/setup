# OpenCode setup

Shared OpenCode settings and locally maintained agent skills.

## Install

Clone this repository, then select the profile for the machine:

```sh
./opencode/install.sh local
./opencode/install.sh ssh
```

The script links the tracked OpenCode files into `~/.config/opencode`. It links
each managed skill into `~/.agents/skills` so other compatible agents can also
use it. Existing files move to a timestamped directory under
`~/.local/state/setup/backups`.

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

## External skills

This repository contains only locally written or modified skills. Install
unmodified external skills with their original package or skill manager. They
can remain beside the managed links in `~/.agents/skills`.
