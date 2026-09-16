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
  "$root/terminal/bin/git-extras/git-effort"
git -C "$root" diff --check
git -C "$root" diff --cached --check

/bin/bash "$root/terminal/core/test.sh"
bash "$root/terminal/core/test.sh"
zsh "$root/terminal/core/test.sh"
/bin/bash "$root/terminal/bin/git-extras/test.sh"
bash "$root/terminal/bin/git-extras/test.sh"
bun test "$root/terminal/core/utils/docopts.test.ts"
sh "$root/terminal/zsh/tests/agent-link.sh"
zsh "$root/terminal/node/tests/npm-wrapper.zsh"

if [[ "$(uname -s)" == Darwin ]]; then
  sh "$root/mac/tests/install.sh"
  sh "$root/mac/choosy/test.sh"
fi

printf 'All setup checks passed.\n'
