# Agents

Shared agent rules and skills, used by both Claude Code and OpenCode.

## Install

```sh
./agents/install.sh
```

The script links `AGENTS.md`, `skills`, and `.skill-lock.json` from this
directory into `~/.agents`. Each harness installer links the same files into
its own directory:

- `agents/install.sh` links `~/.agents/AGENTS.md`, `~/.agents/skills`, and
  `~/.agents/.skill-lock.json`.
- `terminal/claude/install.sh` links `~/.claude/CLAUDE.md` to
  `agents/AGENTS.md` and `~/.claude/skills` to `agents/skills`.
- `terminal/opencode/install.sh` links `~/.config/opencode/AGENTS.md` to
  `agents/AGENTS.md`.

OpenCode also has its own skills, used only by that harness. See
[`terminal/opencode/README.md`](../terminal/opencode/README.md#install).

## Automatic improvement reviews

The shared [`auto-improve` skill](skills/auto-improve/SKILL.md) reviews the
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
bun test terminal/core/utils
sh mac/tests/install.sh
```

## Install skills

`agents/main.sh`, sourced by `.zshrc`, wraps global lifecycle commands for
the `skills` CLI. Commands such as `npx skills add`, `update`, `remove`, and
`list` always use global scope.
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
lists them and `terminal/bin/skill-vendor` syncs them on demand; the
`skill-vendor` skill gives agents the procedure. See `terminal/bin/README.md`.

Each vendored skill has an `UPSTREAM.md` that records the source path, the
revision, and any local edits. The `plannotator*` skills come from the
Plannotator installer (`curl -fsSL https://plannotator.ai/install.sh | bash`).
It writes the core skills directly into `agents/skills/` and installs the extra skills
with `npx skills add`. After an update, run `git diff -- agents/skills`, re-apply the
local edits listed in each `UPSTREAM.md`, update the revision there, and commit.

## Browser control

Both harnesses drive the user's Brave through the shared
[`playwright-cli` skill](skills/playwright-cli/SKILL.md). No browser MCP
server is registered.

- Mac: the Brewfile installs `playwright-cli`. The Raycast command "Open Brave
  Agent" (`mac/raycast/raycast-open-chrome-agent.sh`) starts Brave with its
  own profile and CDP on `127.0.0.1:9222`.
- nspawn: install the CLI with `npm install -g @playwright/cli@latest`.
  `ssh/nspawn.conf` reverse-forwards port 9222 from the Mac, so the same
  endpoint works there. Reconnect SSH once after `ssh/install.sh` adds the
  forward.

The skill attaches with `playwright-cli attach --cdp=http://127.0.0.1:9222`.
Claude Code's `settings.json` lists `playwright-cli *` in the sandbox's
excluded commands, because sandboxed commands cannot reach loopback ports.
