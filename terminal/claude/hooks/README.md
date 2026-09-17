# Auto-improve hook

Bun and Python are not required.

Koffi provides native file locking on macOS and glibc Linux. Version 2.16.3 is
pinned because 3.2.1 crashed during `flock` calls with Intel Node on this
Apple Silicon Mac. Its prebuilt binary avoids a local native build.

`terminal/claude/install.sh` installs the locked production dependencies, then links
the script to `~/.claude/hooks/auto-improve.ts`.
It removes an old Python link only when that link points to this repository's
former hook. It preserves unrelated files and links.

The script requests the removed skill after three completed prompts in a
session. Duplicate events, subagents, and hook continuations do not count.
It keeps the existing JSON state and locks under
`${XDG_STATE_HOME:-$HOME/.local/state}/auto-improve/claude`.
Script errors produce a diagnostic without a review and exit successfully.
The optional command `node "$HOME/.claude/hooks/auto-improve.ts" || true`
prevents missing Node, a missing script, syntax errors, nonzero exits, and
process crashes from blocking a prompt. Diagnostics remain visible.

The state is saved before the review is sent. A crash between those steps
can skip a review, but cannot repeat it.

## Checks

Install development dependencies and run checks from the repository root:

```sh
npm ci --prefix terminal/claude/hooks
npm test --prefix terminal/claude/hooks
npm run typecheck --prefix terminal/claude/hooks
npm run format:check --prefix terminal/claude/hooks
```
