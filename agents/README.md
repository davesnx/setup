# Agents

Shared agent rules and skills, used by both Claude Code and OpenCode.

## MCP servers

`mcp.json` declares every MCP server once, in this repository's own format.
Each server has `type`, `local` or `remote`, and an optional `enabled` that
defaults to true. A local server has `command`, an array, and an optional
`environment`. A remote server has `url`, optional `headers`, and an optional
`oauth` block that only OpenCode uses. Write secrets as `{env:NAME}`.
`mcp.ts` reads and validates the file for both renderers and rejects any other
key, so a typo fails the check instead of being ignored by one tool.

`servers` apply on every machine. `hosts.local` and `hosts.ssh` hold what one
machine adds or changes, keyed by server name: a partial entry merges over the
shared server of that name, and a complete entry adds a server that only that
machine has. The profile names match the OpenCode host profiles that the
installer selects. Today `hosts.ssh` pins the OAuth callback port of each
remote server and adds the Grafana and Buildkite servers that exist only on
nspawn.

`chrome-devtools` does not launch a browser. It attaches to the Brave that the
Raycast command **Open Brave Agent**, `mac/raycast/raycast-open-chrome-agent.sh`,
starts with CDP on `127.0.0.1:9222`. To reach that address from nspawn, configure
a `RemoteForward` in the Mac's `~/.ssh/config` to that port on the Mac.
One shared MCP entry then serves both machines. Start Brave that way before
using the browser tools.

Neither tool reads `mcp.json`. Each has a renderer, and the rendered files are
tracked so that `git pull` updates both tools on nspawn:

- `terminal/claude/mcp.ts` writes `terminal/claude/hosts/local.json` and
  `hosts/ssh.json`. Claude Code reads one file with no layering, so each is
  the complete list for that machine: the shared servers merged with the
  profile's own. The installer links the machine's file to `~/.mcp.json`.
  Disabled servers are left out, `command` splits into `command` and `args`,
  `environment` becomes `env`, secrets become `${NAME}`, and `oauth` is
  dropped because Claude Code runs its own login flow.
- `terminal/opencode/mcp.ts` writes `terminal/opencode/mcp.json`, linked to
  `~/.config/opencode/opencode.json`, which OpenCode deep-merges with
  `opencode.jsonc`. It is a copy under OpenCode's `$schema` with `enabled`
  filled in, because OpenCode requires it. It also writes
  `terminal/opencode/hosts/local.jsonc` and `hosts/ssh.jsonc` from `hosts`,
  with complete entries because OpenCode validates each file on its own. The
  installer links the machine's profile to `host.jsonc`, which the login shell
  exports as `OPENCODE_CONFIG`, so the profile merges over the shared file.

After editing `mcp.json`, run both renderers and commit their output with it:

```sh
node terminal/claude/mcp.ts
node terminal/opencode/mcp.ts
```

Claude Code runs them itself when it edits the file, through a PostToolUse
hook in `terminal/claude/settings.json`. `bash check.sh` fails when a rendered
file is stale and, when `opencode` is installed, runs `opencode debug config`
against the shared file merged with each profile. Both installers render
before linking. Restart the tool to load the change.

### OAuth from nspawn

Tokens are per tool and per machine, and stay out of Git: OpenCode keeps them
in its data directory, Claude Code in the macOS Keychain or in
`~/.claude/.credentials.json` on Linux. Each machine logs in once per tool.
From nspawn the login has two legs. The authorization URL opens in the Mac
browser through a forwarded opener socket. The provider then redirects that
browser to `http://localhost:<port>/callback`. Configure the socket forward
and the callback `LocalForward` entries in the Mac's `~/.ssh/config`, which
is managed outside this repository. Use one `LocalForward` for each
`hosts.ssh.<server>.oauth.callbackPort` declared in [`mcp.json`](mcp.json).
The Mac profile leaves callback ports unpinned. OpenCode reads the port from
the rendered SSH profile:

```sh
opencode mcp auth linear
```

The Claude Code renderer omits the `oauth` settings. For Claude Code over SSH,
use the manual login flow:

```sh
claude mcp login linear --no-browser
```

Open the printed authorization URL in the Mac browser. Paste the final
redirect URL back when prompted. This flow does not need a callback forward.

Both links resolve into this repository, so every MCP server either tool
loads traces back to `mcp.json`. A server that appears anywhere else came
from an external installer replacing a link. In January 2026
`npx vibeship-spawner-skills` wrote a `spawner` server into `~/.mcp.json`
that way.
