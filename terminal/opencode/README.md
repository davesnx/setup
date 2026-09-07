# OpenCode setup

Shared OpenCode settings and agent skills.

## Install

Clone this repository, then select the profile for the machine:

```sh
./terminal/opencode/install.sh local
./terminal/opencode/install.sh ssh
```

The script links the tracked OpenCode files into `~/.config/opencode`. Shared
skills live in the repository-level `agents/skills/` directory, linked to
`~/.agents/skills` and `~/.claude/skills`; OpenCode, Claude Code, Codex, and the
`skills` CLI all read those two locations. Skills that exist only for OpenCode
(currently `simplify`, `code-review`, and the `code-standards` skill they share,
because Claude Code ships its own `/simplify` and `/code-review`) live in
`terminal/opencode/skills/`, linked to `~/.config/opencode/skills`, which only
OpenCode reads. Existing files move to a timestamped directory under
`~/.local/state/setup/backups`.

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

The shared [`auto-improve` skill](../../agents/skills/auto-improve/SKILL.md) reviews the
current session for useful changes to skills, hooks, scripts, and agent rules.
It proposes changes and waits for your approval. The reminders do not change
tool permissions or provide a read-only sandbox.

Both integrations allow one automatic review per session, even when no proposal
is useful. This avoids repeated approval requests without trying to interpret
your answer in a hook. You can request another review manually.

- Claude Code: `UserPromptSubmit` records a prompt ID. `Stop` requests a review
  after three distinct prompts reach a response boundary. The main session
  starts the review as a background fork and ends its turn, so the
  conversation stays free. It relays the fork's proposals when they arrive.
  The continuation Stop is allowed to finish. Requires Python 3 on macOS or
  Linux and Claude Code 2.1.196 or later for prompt IDs. Verified on Claude
  Code 2.1.263.
- OpenCode: the plugin is off by default. OpenCode has no forked subagent, so
  the review would run inline in the conversation. When listed in
  `opencode.jsonc`, it counts three completed normal user turns at
  `session.idle`, then appends a synthetic reminder to the next normal user
  input. The current task comes first. It does not post a separate prompt,
  which could interrupt an active goal or race with new input. Verified on
  OpenCode 1.18.27 with plugin SDK 1.18.25.

`terminal/claude/install.sh` links Claude's hook without replacing the existing
`~/.claude/hooks/dcg` file. The OpenCode installer links `auto-improve.mjs`.
Restart both applications after installation or configuration changes.

Private state lives under `${XDG_STATE_HOME:-$HOME/.local/state}/auto-improve/`,
in separate `claude/` and `opencode/` directories. It stores hashed identifiers
and review state, not prompt or transcript text. Issued markers survive
restarts and resumes. OpenCode's completion count before issuance is in memory
and starts again after a server restart. A new session gets a new allowance.

The integrations save the issued marker before delivering a reminder. If the
process stops in that gap, the review can be skipped rather than repeated.
State or API failures skip the review and produce a diagnostic. They do not
block the user's task. A failed or cancelled turn is not a completed OpenCode
turn; Claude counts a prompt only when its normal Stop hook runs.

To disable Claude's reminders, remove only the auto-improve entries from
`UserPromptSubmit` and `Stop` in `terminal/claude/settings.json`. Leave other
hooks intact. To enable the OpenCode plugin, add `./auto-improve.mjs` to the
plugin list in `terminal/opencode/opencode.jsonc`. The skill remains available
for explicit use.

Run the automated checks from the repository root:

```sh
python3 -m unittest discover -s terminal/claude/tests -p 'test_*.py' -v
node --test terminal/opencode/tests/*.test.mjs
sh mac/tests/install.sh
```

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
expanded by other plugins. Edits are denied by default.

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
sandbox. The plugin test checks that the declared rules survive and the blanket
`*.md` allow is removed. This documentation change does not change permissions.
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
repository's `agents/skills/` directory. It records the source and folder hash of each
installed skill in `~/.agents/.skill-lock.json`, which `agents/install.sh` links to
`agents/skills/.skill-lock.json`. Commit the lock file together with the skills it
describes, so both machines share one record of what is installed.

Before the first `agents/install.sh` run on a machine that already has its own lock
file, merge its entries into the tracked file. Otherwise the installer moves the
old file to the backup directory and its entries are lost:

```sh
jq -s '.[1] * .[0]' agents/skills/.skill-lock.json ~/.agents/.skill-lock.json > agents/skills/.skill-lock.json.new
mv agents/skills/.skill-lock.json.new agents/skills/.skill-lock.json
```

Skills this repository publishes for other people, such as the mlx skills
in `ocaml-mlx/skills`, do not go through the `skills` CLI. `agents/skills/VENDOR`
lists them and `terminal/bin/skill-vendor` syncs them on demand. See
`terminal/bin/README.md`.

Each vendored skill has an `UPSTREAM.md` that records the source path, the
revision, and any local edits. The `plannotator*` skills come from the
Plannotator installer (`curl -fsSL https://plannotator.ai/install.sh | bash`).
It writes the core skills directly into `agents/skills/` and installs the extra skills
with `npx skills add`. After an update, run `git diff -- skills`, re-apply the
local edits listed in each `UPSTREAM.md`, update the revision there, and commit.
