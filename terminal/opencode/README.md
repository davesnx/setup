# OpenCode setup

OpenCode configuration, agents, and OpenCode-only skills.

## Install

Clone this repository, then select the profile for the machine:

```sh
./terminal/opencode/install.sh local
./terminal/opencode/install.sh ssh
```

The script links the tracked OpenCode files into `~/.config/opencode`. Shared
skills and the shared `AGENTS.md` file live in `agents/`; see
[`agents/README.md`](../../agents/README.md) for how each installer links
them. The OpenCode-only skills are `simplify` and `code-review`, because
Claude Code ships its own `/simplify` and `/code-review`. They load the
shared `code-standards` skill from `agents/skills`. The OpenCode-only skills
live in `terminal/opencode/skills/`, linked to `~/.config/opencode/skills`,
which only OpenCode reads. Existing files move to a timestamped directory
under `~/.local/state/setup/backups`.

`main.sh`, sourced by the shell profile, exports `OPENCODE_CONFIG` when the
selected `host.jsonc` link exists. Start a new shell after installation.

## Model selection

OpenCode uses Astra for the main session and the `general` subagent, as configured
in `opencode.jsonc`. `instructions.md` contains OpenCode-only guidance and is
loaded through that config's `instructions` field. It is not shared with Claude.
`AGENTS.md` keeps the shared engineering rules without a model requirement.

Restart OpenCode after changing these settings.

## Skill access

OpenCode recognizes `name`, `description`, `license`, `compatibility`, and
`metadata` in skill frontmatter. It ignores `disable-model-invocation`.
Use `permission.skill` in `opencode.jsonc`, or
`agent.<name>.permission.skill`, to control access:

- `allow`: list the skill and allow loading it.
- `ask`: keep it listed, but require approval before loading its body.
- `deny`: hide it and reject calls through the skill tool.

These settings control the skill tool, not direct file reads. `ask` does not
reduce catalogue context, and `deny` is not a manual-only mode. A dedicated
command or agent is needed if a workflow must stay available by explicit request
while hidden from the normal agent. No catalogue-wide restrictions are applied
by this setup yet.

## Automatic improvement reviews

See [`agents/README.md`](../../agents/README.md#automatic-improvement-reviews)
for the shared contract. OpenCode's plugin, `auto-improve.mjs`, is off by
default. Add it to the plugin list in `opencode.jsonc` to enable it.

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

Plannotator is pinned to `0.27.12` and uses its `user-managed` workflow. Its config
hook leaves permissions unchanged: only Plan can call `submit_plan`, and Plan
edits are denied by default. The local plugin only repairs Writer's Bash rules.

In `~/workplace` or below it, agents first read `~/workplace/AGENTS.md`.
Project plans use `<project-root>/.workplace/plans/<task>_PLAN.md`. Shared tasks
use `~/workplace/plans/<task>_PLAN.md`. Outside workplace, plans use
`plans/<descriptive-name>_PLAN.md` at the repository root, with `plans/` ignored
by Git. This repository already ignores `/plans/`.

Plan permits `plans/*_PLAN.md` and `*/plans/*_PLAN.md`. It also retains the
legacy permissions `docs/tasks/*/plan.md` and `*/docs/tasks/*/plan.md`, not all
Markdown files. Those legacy paths are not the current workplace plan location.
OpenCode checks paths relative to the checkout, or to `/` when started outside
Git. Its `*` matches `/`, so these rules can match paths across project homes,
checkouts, and task worktrees. The rules are not a workplace-only filesystem
sandbox. The integration test checks that the declared rules survive the pinned
upstream hook without adding a blanket `*.md` allow.
Report blocked paths rather than granting broader edits.

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

## Permission integration check

With Node.js and npm available, run from the repository root:

```sh
sh terminal/opencode/tests/integration/run.sh
```

The runner copies the config, agent files, and hooks into a temporary directory.
It installs the test-only locked dependencies there with lifecycle scripts
disabled. The test loads Plannotator's OpenCode 1 `main` entry, calls its actual
config hook, then calls the local repair twice in sequence. It checks Plan's
declared permissions and Writer's global hard denies, including rule order.
No OpenCode application, provider, MCP server, model session, or review tool runs.
HOME, XDG directories, and backup paths are isolated. The temporary directory is
removed on exit. The real config and notification plugin are not changed.

Dependency preparation needs the npm registry unless you supply a populated
scratch cache. To repeat the whole check offline:

```sh
cache=$(mktemp -d)
SETUP_TEST_NPM_CACHE="$cache" sh terminal/opencode/tests/integration/run.sh
SETUP_TEST_NPM_CACHE="$cache" SETUP_TEST_OFFLINE=true sh terminal/opencode/tests/integration/run.sh
```

`tests/integration/package-lock.json` records the package integrity. Version
`0.27.12` matches the reviewed deployed cache and the npm package. Its
`user-managed` config hook returns without changing permissions, so no Plan
repair is needed. Writer still needs the local repair because its Bash `ask`
default overrides global denies. On upgrades, review the upstream hook, update
the config pin and test lock together, then run this check. Restart OpenCode
after changing the deployed config or plugin.

## Browser tools

Both profiles use the shared `playwright-cli` skill. Neither registers a
browser MCP server. See [`agents/README.md`](../../agents/README.md#browser-control).

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
