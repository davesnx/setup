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

The global `AGENTS.md` file is also linked to `~/.config/opencode/AGENTS.md`,
`~/.agents/AGENTS.md`, and `~/.claude/CLAUDE.md`, so Claude Code reads the same
rules.

The shell configuration exports `OPENCODE_CONFIG` when the selected
`host.jsonc` link exists. Start a new shell after installation.

## Model selection

OpenCode uses Astra for the main session and the `general` subagent, as configured
in `opencode.jsonc`. `instructions.md` contains OpenCode-only guidance and is
loaded through that config's `instructions` field. It is not shared with Claude.
`AGENTS.md` keeps the shared engineering rules without a model requirement.

`../claude/settings.json` keeps Fable 5.1 for Claude's main work. Its
`CLAUDE_CODE_SUBAGENT_MODEL=sonnet` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` settings
select Sonnet for subagents, teammates, and workflow agents, including those with
their own model overrides. The force setting requires Claude Code 2.1.257 or
later. The Sonnet alias follows the version selected by the provider.

Restart OpenCode and Claude Code after changing these settings.

## Plan agent

[`agents/plan.md`](agents/plan.md) overrides the built-in Plan agent using
[OpenCode's Markdown agent configuration](https://opencode.ai/docs/agents/#markdown).
The installer already links this directory into `~/.config/opencode/agents`.
Plan keeps the configured model and researches facts before asking you to decide
constraints and trade-offs. Clear tasks use a short draft rather than a forced
interview.

Plan maintains one live document with accepted constraints, assumptions,
exclusions, ownership, acceptance checks, and stop conditions. Later decisions
can remain deferred. It requests approval before handing implementation to
Build and does not start implementation itself. Interviews use short rounds of
at most three questions, each with a recommendation and reason.

Quit and restart OpenCode after changing the agent. Select **Plan** with Tab.
Use `opencode debug agent plan` to inspect the loaded prompt and permissions.

Plannotator uses its `user-managed` workflow: only Plan can call `submit_plan`.
The final local permission plugin keeps Plan's declared edit paths from being
expanded by other plugins. This repository ignores `/plans/` for its plan files.

## Writer agent

[`agents/writer.md`](agents/writer.md) replaces the Docs agent with a general
writing partner for documentation, articles, emails, and other prose. It
reads project instructions and `VOICE.md` when present, and uses the writing
skill that matches the task. It completes only the requested writing stage.

Writer can edit prose files directly. Shell commands and edits to other file
types require approval. Publishing, sending, committing, and pushing each need
explicit authorization.

The local permission plugin reapplies global hard Bash denies after Writer's
approval default, so dangerous commands do not become approval prompts.

Quit and restart OpenCode, then select **Writer** with Tab. Use
`opencode debug agent writer` to inspect the loaded prompt and permissions.

## Browser tools

The local profile starts Chrome DevTools MCP with a persistent Brave profile.
Playwriter uses its standard local relay on `127.0.0.1:19988` and the Brave
extension.

The SSH profile connects Chrome DevTools and Playwriter directly to Chromium's
CDP endpoint on `127.0.0.1:9222` inside the remote host.

## Eval harness

The command, dependencies, patches, shims, tests, and installer live in
[`terminal/bin/eval-harness`](../bin/eval-harness/README.md). Run
`sh terminal/bin/eval-harness/install.sh` from the repository root to install it.
The OpenCode installer no longer installs the harness.

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
repository's `skills/` directory. It records the source and folder hash of each
installed skill in `~/.agents/.skill-lock.json`, which `install.sh` links to
`skills/.skill-lock.json`. Commit the lock file together with the skills it
describes, so both machines share one record of what is installed.

Before the first `install.sh` run on a machine that already has its own lock
file, merge its entries into the tracked file. Otherwise the installer moves the
old file to the backup directory and its entries are lost:

```sh
jq -s '.[1] * .[0]' skills/.skill-lock.json ~/.agents/.skill-lock.json > skills/.skill-lock.json.new
mv skills/.skill-lock.json.new skills/.skill-lock.json
```

Each vendored skill has an `UPSTREAM.md` that records the source path, the
revision, and any local edits. The `plannotator*` skills come from the
Plannotator installer (`curl -fsSL https://plannotator.ai/install.sh | bash`).
It writes the core skills directly into `skills/` and installs the extra skills
with `npx skills add`. After an update, run `git diff -- skills`, re-apply the
local edits listed in each `UPSTREAM.md`, update the revision there, and commit.
