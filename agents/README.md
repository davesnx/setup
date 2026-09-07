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
It proposes changes and waits for your approval. Claude's reminder does not
change tool permissions. OpenCode restricts its separate review session's tools;
it does not change the source session's permissions or isolate the filesystem.

Both integrations allow one automatic review per session, even when no proposal
is useful. This avoids repeated approval requests without trying to interpret
your answer in a hook. You can request another review manually.

- Claude Code: `UserPromptSubmit` records a prompt ID. `Stop` requests a review
  after three distinct prompts reach a response boundary. The main session
  starts the review as a background fork and ends its turn, so the
  conversation stays free. It relays the fork's proposals when they arrive.
  The continuation Stop is allowed to finish. Requires Node 22.18 or later on
  macOS or Linux and Claude Code 2.1.196 or later for prompt IDs. Verified on
  Claude Code 2.1.263.
- OpenCode: the enabled plugin counts three completed normal user turns at
  `session.idle`, then forks the history into an independent review session.
  The source can continue while the review runs. No review prompt, tool call,
  or result is added to the source context. A notification points to proposals
  under `Auto-improve: <source title>` in `/sessions`. The plugin stays silent
  when there are no proposals. Verified on OpenCode 1.18.27 with SDK 1.18.25.

OpenCode's hidden reviewer allows only reads, file searches, and the shared
skill. Global, source-agent, and source-session restrictions remain in force;
access that needs approval is denied during the automatic review. The reviewer
cannot apply changes. Request approved changes in a normal session. See the
[OpenCode reference](../terminal/opencode/README.md#automatic-improvement-reviews)
for costs, disabling instructions, and the isolated live test.

`terminal/claude/install.sh` links Claude's hook without replacing the existing
`~/.claude/hooks/dcg` file. The OpenCode installer links `auto-improve.mjs`.
Restart both applications after installation or configuration changes.

Private state lives under `${XDG_STATE_HOME:-$HOME/.local/state}/auto-improve/`,
in separate `claude/` and `opencode/` directories. It stores hashed identifiers
and review state, not prompt or transcript text. Issued markers survive
restarts and resumes. OpenCode's completion count before issuance is in memory
and starts again after a server restart. A new session gets a new allowance.
OpenCode stores the copied history and proposals in its normal session storage,
separate from these private marker files. Review execution and notification
tracking do not resume after a restart; a completed review remains readable.

The integrations save the issued marker before requesting a review. If the
process stops or setup fails after that claim, the review is skipped rather
than repeated. New source input during OpenCode's setup also cancels launch;
it does not cancel a review that has already started.
State or API failures skip the review and produce a diagnostic. They do not
block the user's task. A failed or cancelled turn is not a completed OpenCode
turn; Claude counts a prompt only when its normal Stop hook runs.

To disable Claude's reminders, remove only the auto-improve entries from
`UserPromptSubmit` and `Stop` in `terminal/claude/settings.json`. Leave other
hooks intact. To disable OpenCode's automatic reviews, remove `./auto-improve.mjs`
from the plugin list in `terminal/opencode/opencode.jsonc`. The skill remains available
for explicit use.

Run the automated checks from the repository root:

```sh
npm ci --prefix terminal/claude/hooks
npm test --prefix terminal/claude/hooks
npm run typecheck --prefix terminal/claude/hooks
npm run format:check --prefix terminal/claude/hooks
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
  `ssh/config.conf` reverse-forwards port 9222 from the Mac, so the same
  endpoint works there.

The skill attaches with `playwright-cli attach --cdp=http://127.0.0.1:9222`.
Claude Code's `settings.json` lists `playwright-cli *` in the sandbox's
excluded commands, because sandboxed commands cannot reach loopback ports.
