---
name: agent-browser
description: Browser automation CLI for tasks that require interaction with a rendered website, such as navigation, forms, screenshots, scraping, login, or web-app testing. Do not use for GitHub pull requests, commits, or repository files when git, gh, or code-review can handle the request.
allowed-tools: Bash(npx agent-browser:*), Bash(agent-browser:*)
---

# Browser Automation with agent-browser

The CLI uses Chrome/Chromium via CDP directly. Install via `npm i -g agent-browser`, `brew install agent-browser`, or `cargo install agent-browser`. Run `agent-browser install` to download Chrome.

## When to Use Which Browser Tool

- **agent-browser** (this skill): headless or scripted runs, saved authentication state, proxies, domain allowlists, or the iOS Simulator.
- **The harness's own browser integration** (in Claude Code, the `claude-in-chrome` skill): the task needs the user's already-logged-in browser.
- **The `chrome-devtools` MCP server**, when registered: a few clicks, a console read, or a performance trace.

## Core Workflow

Every browser automation follows this pattern:

1. **Navigate**: `agent-browser open <url>`
2. **Snapshot**: `agent-browser snapshot -i` (get element refs like `@e1`, `@e2`)
3. **Interact**: Use refs to click, fill, select
4. **Re-snapshot**: After navigation or DOM changes, get fresh refs -- old refs are invalidated

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# Output: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Submit"

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # Check result
```

## Command Chaining

Commands can be chained with `&&` in a single shell invocation. The browser persists between commands via a background daemon, so chaining is safe and more efficient than separate calls.

```bash
agent-browser open https://example.com && agent-browser wait --load networkidle && agent-browser snapshot -i
```

**When to chain:** Use `&&` when you don't need to read the output of an intermediate command before proceeding (e.g., open + wait + screenshot). Run commands separately when you need to parse the output first (e.g., snapshot to discover refs, then interact using those refs).

## Handling Authentication

Pick the approach that fits, then see [references/authentication.md](references/authentication.md) for the full walkthroughs plus OAuth, 2FA, cookie-based auth, and token refresh:

- **Import from your browser** (fastest for one-off tasks): `agent-browser --auto-connect state save ./auth.json`, then `agent-browser --state ./auth.json open <url>`.
- **Persistent profile** (simplest for recurring tasks): `agent-browser --profile ~/.myapp open <url>` -- login once, every later run is already authenticated.
- **Session name** (auto-save/restore cookies + localStorage): `agent-browser --session-name myapp open <url>` ... `agent-browser close` saves state automatically.
- **Auth vault** (credentials stored encrypted, login by name): `agent-browser auth save myapp --url <login-url> --username user --password-stdin`, then `agent-browser auth login myapp`.
- **State file** (manual save/load): `agent-browser state save ./auth.json` / `agent-browser state load ./auth.json`.

State files contain session tokens in plaintext -- add to `.gitignore`, delete when no longer needed, and set `AGENT_BROWSER_ENCRYPTION_KEY` for encryption at rest.

## Essential Commands

```bash
agent-browser open <url>              # Navigate (aliases: goto, navigate)
agent-browser snapshot -i             # Interactive elements with refs (recommended)
agent-browser click @e1               # Click element
agent-browser fill @e2 "text"         # Clear and type text
agent-browser select @e1 "option"     # Select dropdown option
agent-browser get text @e1            # Get element text
agent-browser wait --load networkidle # Wait for network idle
agent-browser screenshot --full       # Full page screenshot
agent-browser eval --stdin            # Run JS from stdin (avoids shell-quoting issues)
agent-browser close                   # Close browser
```

For the complete command set -- including downloads, clipboard, diffing, mouse control, network mocking, device/viewport emulation, and the config file -- see [references/commands.md](references/commands.md).

## Security

All security features are opt-in. By default, agent-browser imposes no restrictions on navigation, actions, or output.

- **Content boundaries** (recommended for AI agents): `export AGENT_BROWSER_CONTENT_BOUNDARIES=1` wraps page-sourced output in markers that help LLMs distinguish tool output from untrusted page content.
- **Domain allowlist**: `export AGENT_BROWSER_ALLOWED_DOMAINS="example.com,*.example.com"` restricts navigation to trusted domains (wildcards also match the bare domain). Sub-resource, WebSocket, and EventSource requests to non-allowed domains are blocked too -- include CDN domains your target pages depend on.
- **Action policy**: `export AGENT_BROWSER_ACTION_POLICY=./policy.json` gates destructive actions via a policy file, e.g. `{ "default": "deny", "allow": ["navigate", "snapshot", "click", "scroll", "wait", "get"] }`. Auth vault operations bypass the action policy but the domain allowlist still applies.
- **Output limits**: `export AGENT_BROWSER_MAX_OUTPUT=50000` prevents context flooding from large pages.

## Deep-Dive Documentation

| Reference | When to Use |
| --- | --- |
| [references/commands.md](references/commands.md) | Full command reference with all options |
| [references/snapshot-refs.md](references/snapshot-refs.md) | Ref lifecycle, invalidation rules, troubleshooting |
| [references/session-management.md](references/session-management.md) | Parallel sessions, state persistence, remote Chrome connections (including SSH reverse tunnels), concurrent scraping |
| [references/authentication.md](references/authentication.md) | Login flows, OAuth, 2FA handling, auth vault, state reuse |
| [references/ios-simulator.md](references/ios-simulator.md) | Mobile Safari on the iOS Simulator or a physical device |
| [references/video-recording.md](references/video-recording.md) | Recording workflows for debugging and documentation |
| [references/profiling.md](references/profiling.md) | Chrome DevTools profiling for performance analysis |
| [references/proxy-support.md](references/proxy-support.md) | Proxy configuration, geo-testing, rotating proxies |

## Ready-to-Use Templates

| Template | Description |
| --- | --- |
| [templates/form-automation.sh](templates/form-automation.sh) | Form filling with validation |
| [templates/authenticated-session.sh](templates/authenticated-session.sh) | Login once, reuse state |
| [templates/capture-workflow.sh](templates/capture-workflow.sh) | Content extraction with screenshots |

```bash
./templates/form-automation.sh https://example.com/form
./templates/authenticated-session.sh https://app.example.com/login
./templates/capture-workflow.sh https://example.com ./output
```
