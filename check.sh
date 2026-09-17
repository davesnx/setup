#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)

for tool in git shellcheck shfmt zsh bun node npm python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf '%s is required to run the checks.\n' "$tool" >&2
    exit 69
  fi
done

bash "$root/shellcheck.sh"
shfmt -d -i 2 -ci "$root/check.sh" "$root/shellcheck.sh" \
  "$root/terminal/core/test.sh" "$root/terminal/bin/git-extras/test.sh" \
  "$root/terminal/bin/git-extras/git-effort" \
  "$root/terminal/bin/testzsh" "$root/terminal/bin/testzsh.test.sh"
git -C "$root" diff --check
git -C "$root" diff --cached --check

/bin/bash "$root/terminal/core/test.sh"
bash "$root/terminal/core/test.sh"
zsh "$root/terminal/core/test.sh"
/bin/bash "$root/terminal/bin/git-extras/test.sh"
bash "$root/terminal/bin/git-extras/test.sh"
/bin/bash "$root/terminal/bin/testzsh.test.sh"
bash "$root/terminal/bin/testzsh.test.sh"
bun test "$root/terminal/core/utils/docopts.test.ts"
bun test "$root/agents/mcp.test.ts"
bun test "$root/terminal/claude/mcp.test.ts"
bun test "$root/terminal/opencode/mcp.test.ts"
sh "$root/terminal/zsh/tests/agent-link.sh"
zsh "$root/terminal/zsh/tests/cached-init.zsh"
zsh "$root/terminal/node/tests/npm-wrapper.zsh"

# Layout: AGENTS.md names only paths that exist, every tracked directory in
# the first two levels has a row, and no tracked symlink is absolute.
tree=$(awk '/^```text/ { inside = 1; next } /^```/ { inside = 0 } inside && /^[^ `]/ { print $1 }' "$root/AGENTS.md")
for path in $tree; do
  if [[ ! -e "$root/$path" ]]; then
    printf 'AGENTS.md names a missing path: %s\n' "$path" >&2
    exit 1
  fi
done
while IFS= read -r dir; do
  if ! grep -q "^$dir/" <<<"$tree"; then
    printf 'Directory has no row in AGENTS.md: %s\n' "$dir" >&2
    exit 1
  fi
done < <(git -C "$root" ls-files | awk -F/ 'NF > 1 { print $1 } NF > 2 { print $1 "/" $2 }' | sort -u)
while IFS= read -r link; do
  if [[ "$(readlink "$root/$link")" == /* ]]; then
    printf 'Absolute symlink: %s\n' "$link" >&2
    exit 1
  fi
done < <(git -C "$root" ls-files -s | awk '$1 == "120000" { print $4 }')

if [[ "$(uname -s)" == Darwin ]]; then
  sh "$root/mac/tests/install.sh"
  sh "$root/mac/choosy/test.sh"
fi

printf 'All setup checks passed.\n'
