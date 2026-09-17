#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)

usage() {
  printf 'Usage: bash check.sh [--shell-only | --help]\nRun all setup checks, or only ShellCheck and Zsh syntax checks.\n'
}

shell_only=false
if [[ $# -gt 1 ]]; then
  usage >&2
  exit 64
fi
if [[ $# -eq 1 ]]; then
  case "$1" in
    --shell-only) shell_only=true ;;
    --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 64
      ;;
  esac
fi

required_tools=(git shellcheck zsh)
if ! "$shell_only"; then
  required_tools+=(shfmt bun node npm python3 jq)
fi
for tool in "${required_tools[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf '%s is required to run the checks.\n' "$tool" >&2
    exit 69
  fi
done

files=()
zsh_files=()
while IFS= read -r -d '' file; do
  [[ -f "$root/$file" ]] || continue
  IFS= read -r first_line <"$root/$file" || true
  case "$first_line" in
    '#!'*zsh*) zsh_files+=("$root/$file") ;;
    '#!'*bash* | '#!'*'/sh' | '#!'*' sh' | '# shellcheck shell='*) files+=("$root/$file") ;;
    '#!'*) ;;
    *)
      case "${file##*/}" in
        *.sh) files+=("$root/$file") ;;
        *.zsh | .zimrc | .zshenv | .zshrc | .zprofile | .zlogin | .zlogout) zsh_files+=("$root/$file") ;;
      esac
      ;;
  esac
done < <(git -C "$root" ls-files --cached --others --exclude-standard -z)

status=0
for file in ${files[@]+"${files[@]}"}; do
  IFS= read -r first_line <"$file" || true
  shell=bash
  case "$first_line" in
    '#!'*'/sh' | '#!'*' sh' | '# shellcheck shell=sh') shell='sh' ;;
  esac
  case "$file" in */prelude.sh) shell='sh' ;; esac
  shellcheck --norc --external-sources --source-path=SCRIPTDIR --source-path="$root" \
    --shell="$shell" --format=gcc "$file" || status=1
done
for file in ${zsh_files[@]+"${zsh_files[@]}"}; do
  zsh -n "$file" || status=1
done
printf 'Checked %s shell scripts and %s Zsh scripts.\n' "${#files[@]}" "${#zsh_files[@]}"
if "$shell_only" || [[ "$status" -ne 0 ]]; then
  exit "$status"
fi

shfmt -d -i 2 -ci "$root/check.sh" \
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
bash "$root/terminal/zsh/tests/syntax-selection.sh"
zsh "$root/terminal/bin/scripts.test.zsh"
sh "$root/mac/tests/shell-startup.sh"
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
  /bin/bash "$root/mac/tests/browser-cdp.sh"
  sh "$root/mac/tests/install.sh"
  sh "$root/mac/choosy/test.sh"
fi

printf 'All setup checks passed.\n'
