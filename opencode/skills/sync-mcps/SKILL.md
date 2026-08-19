---
name: sync-mcps
description: Use when the user says "sync MCPs", "sync MCP servers", "update MCPs on nspawn", or wants OpenCode MCP definitions synchronized between this Mac and nspawn without copying credentials.
---

# Sync OpenCode MCPs

Synchronize portable OpenCode MCP definitions between this machine and `nspawn` while preserving machine-specific local servers and authenticating OAuth separately on each host.

## Workflow

1. Read the local config from `~/.config/opencode/opencode.jsonc`.
2. Copy `nspawn:~/.config/opencode/opencode.jsonc` to a temporary file and read it.
3. Compare entries under `mcp`.
4. Synchronize entries with `type: "remote"` in both directions. If the same server differs, show the conflict and ask which definition should win.
5. Treat entries with `type: "local"` as host-specific by default. Only copy one when its command, environment, and backing service are confirmed to work on the target host.
6. Patch the local config and temporary remote config with the smallest possible edits, preserving JSONC comments and unrelated settings.
7. Copy the patched remote config back to `nspawn`.
8. Run `opencode mcp list` locally and `ssh nspawn 'zsh -lic "opencode mcp list"'` remotely.
9. For any remote MCP that needs authentication, run `opencode mcp auth <name>` independently on that host. When authenticating on `nspawn`, use an SSH local forward for the OAuth callback port if necessary.

## Rules

- Never copy `~/.local/share/opencode/mcp-auth.json` or any token, client secret, cookie, or credential file.
- Never place literal secrets in an OpenCode config. Use `{env:VARIABLE}` or `{file:path}` references.
- Never replace an entire config when a targeted JSONC edit is sufficient.
- Never delete an MCP definition unless the user explicitly asks for pruning.
- Keep OAuth state per host because refresh-token rotation and host compromise should remain isolated.
- Explain skipped local MCPs and what dependency prevents them from being portable.
