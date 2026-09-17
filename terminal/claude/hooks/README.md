# Auto-improve hook

`auto-improve.ts` runs directly with Node 22.18 or later from Claude's
`UserPromptSubmit` and `Stop` hooks. Node must be on Claude's `PATH`.
Bun and Python are not required.

Koffi provides native file locking on macOS and glibc Linux. Version 2.16.3 is
pinned because 3.2.1 crashed during `flock` calls with Intel Node on this
Apple Silicon Mac. Its prebuilt binary avoids a local native build.

`terminal/claude/install.sh` installs the locked production dependencies, then links
the script to `~/.claude/hooks/auto-improve.ts`.
It removes an old Python link only when that link points to this repository's
former hook. It preserves unrelated files and links.

After three completed prompts in a session, the `Stop` hook starts one
detached, headless reviewer: `claude -p` in `--permission-mode plan`, given
that session's transcript path as evidence. It runs independently of the
working session; nothing is injected into it, and the hook's own process
exits immediately after starting the reviewer. Duplicate events, subagents,
and hook continuations do not count toward the three prompts.

The hook keeps its JSON state and locks under
`${XDG_STATE_HOME:-$HOME/.local/state}/auto-improve/claude`. Reports land in
that same directory as `<uuid>.report.md`; a run that fails leaves
`<uuid>.failed.md` instead. The
[statusline](../statusline.ts) shows how many unread reports exist. Read one
with `cat`, then apply a proposal by running `claude --resume <uuid>` (leave
plan mode first if the resumed session is still in it). Delete the report
file to dismiss it. The reviewer's own hooks stay quiet, since it runs with
`AUTO_IMPROVE_REVIEWER=1` in its environment.

Script errors produce a diagnostic without a review and exit successfully.
Both configured commands also use `|| true`, so missing Node, a missing
script, syntax errors, nonzero exits, and process crashes do not block a
prompt. Diagnostics remain visible. The hooks retain their five-second
timeout.

The state is saved before the reviewer is started. A crash between those
steps can skip a review, but cannot repeat it.

## Disable automatic reviews

In [`terminal/claude/settings.json`](../settings.json), remove the command
entry that runs `auto-improve.ts` from both `hooks.UserPromptSubmit` and
`hooks.Stop`. Keep all other hook entries. Restart Claude Code to load the
change.

## Checks

Install development dependencies and run checks from the repository root:

```sh
npm ci --prefix terminal/claude/hooks
npm test --prefix terminal/claude/hooks
npm run typecheck --prefix terminal/claude/hooks
npm run format:check --prefix terminal/claude/hooks
```
