# Upstream source

- Repository: https://github.com/vercel-labs/agent-browser
- Source: https://github.com/vercel-labs/agent-browser (skills/agent-browser/SKILL.md)
- Revision: not recorded
- Vendored: March 14, 2026
- License: not recorded

`SKILL.md` was vendored from upstream. Local changes (2026-09-03): rewrote `SKILL.md` from a 659-line document that inlined material already covered in `references/*.md` into a router under 250 lines. Moved content that had no home yet into reference files before cutting it from `SKILL.md`: the auth vault workflow into `references/authentication.md`; the SSH reverse-tunnel and "connect to an existing Chrome" patterns, plus the idle-timeout cleanup note, into `references/session-management.md`; the iOS Simulator workflow into a new `references/ios-simulator.md`; and downloads, clipboard, diffing, annotated screenshots, the JavaScript eval shell-quoting notes, the configuration file, browser engine selection, viewport/retina/color-scheme details, and several missing CLI flags and environment variables into `references/commands.md`. No information was dropped. Added a "When to use which browser tool" section pointing to the harness's own browser integration and the `chrome-devtools` MCP server for tasks that don't need this CLI.
