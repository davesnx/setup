# Browser Session Management

Use this reference for failed CDP connections or advanced session needs.
Routine attach/open is covered by the [common path](../SKILL.md#common-browser-task).
Follow the [root safety rules](../SKILL.md#safety-and-ownership). Names below
are examples, not permission to take over an existing session. Add
`-s=<task-session>` to unqualified commands, or set `PLAYWRIGHT_CLI_SESSION`.

## Brave on the Mac

The user's browser is Brave on the Mac. The Raycast command "Open Brave Agent"
(`mac/raycast/raycast-open-chrome-agent.sh` in the setup repository) starts it
with CDP on `127.0.0.1:9222`. On nspawn, SSH forwards that port from the Mac.

When `attach` fails with `connect ECONNREFUSED 127.0.0.1:9222`, nothing
listens on the port. Stop and tell the user. Do not fall back to a headless
browser unless they agree. Ask them to start Brave with CDP on the Mac, either
with "Open Brave Agent" in Raycast or by running
`mac/raycast/raycast-open-chrome-agent.sh` from the setup checkout in a Mac
shell. On nspawn, the SSH session must also carry the 9222 forward from
`ssh/nspawn.conf`; if Brave is already running, ask them to reconnect SSH.
Retry the common path's named `attach` command after they confirm.

Without Brave, `playwright-cli open` needs `--browser=chromium` or a config
that selects the bundled Chromium; the default channel is Google Chrome.
Sites behind Cloudflare, such as hltv.org, can block that headless browser.
See [open parameters](browser-commands.md#open-parameters) for browser,
mobile/device, profile, and config examples.

## Named Browser Sessions

Use `-s` to name separate browsers created with `open`:

```bash
# Browser 1: Authentication flow
playwright-cli -s=auth open https://app.example.com/login

# Browser 2: Public browsing (separate cookies, storage)
playwright-cli -s=public open https://example.com

# Commands are isolated by browser session
playwright-cli -s=auth fill e1 "user@example.com"
playwright-cli -s=public snapshot
```

## Browser Session Isolation Properties

Separately opened browsers have independent:
- Cookies
- LocalStorage / SessionStorage
- IndexedDB
- Cache
- Browsing history
- Open tabs

Multiple named CDP attachments to the same external browser share its state;
the name routes CLI commands, not a separate browser context.

## Browser Session Commands

```bash
# List all browser sessions
playwright-cli list

# Stop only a browser opened by this task
playwright-cli -s=mysession close
# Release only a connection attached by this task
playwright-cli -s=brave-task detach

# Delete task-owned profile data only with user approval
playwright-cli -s=mysession delete-data
```

`close-all` and `kill-all` affect other sessions. Do not use them for task
cleanup or stale-session recovery; report an unresponsive owned session if
scoped cleanup fails.

## Environment Variable

Set a default browser session name via environment variable:

```bash
export PLAYWRIGHT_CLI_SESSION="mysession"
playwright-cli open example.com  # Uses "mysession" automatically
```

## Common Patterns

### Concurrent Scraping

```bash
#!/bin/bash
# Scrape multiple sites concurrently

# Start all browsers
playwright-cli -s=site1 open https://site1.com &
playwright-cli -s=site2 open https://site2.com &
playwright-cli -s=site3 open https://site3.com &
wait

# Take snapshots from each
playwright-cli -s=site1 snapshot
playwright-cli -s=site2 snapshot
playwright-cli -s=site3 snapshot

# Cleanup
playwright-cli -s=site1 close
playwright-cli -s=site2 close
playwright-cli -s=site3 close
```

### A/B Testing Sessions

```bash
# Test different user experiences
playwright-cli -s=variant-a open "https://app.com?variant=a"
playwright-cli -s=variant-b open "https://app.com?variant=b"

# Compare
playwright-cli -s=variant-a screenshot
playwright-cli -s=variant-b screenshot
```

### Persistent Profile

By default, browser profile is kept in memory only. Use `--persistent` flag on `open` to persist the browser profile to disk:

```bash
# Use persistent profile (auto-generated location)
playwright-cli open https://example.com --persistent

# Use persistent profile with custom directory
playwright-cli open https://example.com --profile=/path/to/profile
```

## Attaching to a Running Browser

Use `attach` to connect to a browser that is already running, instead of launching a new one.

### Attach by channel name

Connect to a running Chrome or Edge instance by its channel name. The browser must have remote debugging enabled — navigate to `chrome://inspect/#remote-debugging` in the target browser and check "Allow remote debugging for this browser instance".

```bash
# Attach to Chrome
playwright-cli attach --cdp=chrome

# Attach to Chrome Canary
playwright-cli attach --cdp=chrome-canary

# Attach to Microsoft Edge
playwright-cli attach --cdp=msedge

# Attach to Edge Dev
playwright-cli attach --cdp=msedge-dev
```

Supported channels: `chrome`, `chrome-beta`, `chrome-dev`, `chrome-canary`, `msedge`, `msedge-beta`, `msedge-dev`, `msedge-canary`.

When `--session` is not provided, the session is named after the channel (e.g. `--cdp=msedge` creates a session called `msedge`), so parallel attaches to Chrome and Edge don't collide on `default`. Pass `--session=<name>` to override.

### Attach via CDP endpoint

Connect to a browser that exposes a Chrome DevTools Protocol endpoint:

```bash
playwright-cli attach --cdp=http://localhost:9222
```

### Attach via browser extension

Connect to a browser with the Playwright extension installed:

```bash
playwright-cli attach --extension
```

### Detach

Tear down an attached session without affecting the external browser:

```bash
# Detach the default attached session
playwright-cli detach

# Detach a specific attached session
playwright-cli -s=msedge detach
```

`detach` only works on sessions created via `attach`. For sessions created via `open`, use `close`.

## Default Browser Session

When `-s` is omitted, commands use the default browser session:

```bash
# These use the same default browser session
playwright-cli open https://example.com
playwright-cli snapshot
playwright-cli close  # Stops default browser
```

## Browser Session Configuration

Configure a browser session with specific settings when opening:

```bash
# Open with config file
playwright-cli open https://example.com --config=.playwright/my-cli.json

# Open with specific browser
playwright-cli open https://example.com --browser=firefox

# Open in headed mode
playwright-cli open https://example.com --headed

# Open with persistent profile
playwright-cli open https://example.com --persistent
```

## Best Practices

### 1. Name Browser Sessions Semantically

```bash
# GOOD: Clear purpose
playwright-cli -s=github-auth open https://github.com
playwright-cli -s=docs-scrape open https://docs.example.com

# AVOID: Generic names
playwright-cli -s=s1 open https://github.com
```

### 2. Clean Up Owned Sessions

```bash
# Stop only browsers this task opened
playwright-cli -s=auth close
playwright-cli -s=scrape close
# For an attached browser, detach instead
playwright-cli -s=brave-task detach
```

### 3. Delete Stale Browser Data

```bash
# Remove only task-owned data with user approval
playwright-cli -s=oldsession delete-data
```
