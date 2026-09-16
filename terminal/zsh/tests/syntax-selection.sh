#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/repo/terminal/zsh" "$work/bin"
cp "$root/shellcheck.sh" "$work/repo/shellcheck.sh"
git -C "$work/repo" init -q
printf '#!/bin/sh\nexit 0\n' >"$work/bin/shellcheck"
chmod +x "$work/bin/shellcheck"

for name in .zimrc .zshenv .zshrc .zprofile .zlogin .zlogout; do
  file="$work/repo/terminal/zsh/$name"
  printf 'if then\n' >"$file"
  if PATH="$work/bin:$PATH" bash "$work/repo/shellcheck.sh" >"$work/result" 2>&1; then
    printf 'FAIL: shellcheck.sh accepted invalid Zsh in %s\n' "$name" >&2
    exit 1
  fi
  printf 'touch "%s/unexpected-execution"\n' "$work" >"$file"
  PATH="$work/bin:$PATH" bash "$work/repo/shellcheck.sh" >"$work/result" 2>&1
  [[ ! -e "$work/unexpected-execution" ]]
  rm "$file"
done
printf 'if then\n' >"$work/repo/notes.txt"
PATH="$work/bin:$PATH" bash "$work/repo/shellcheck.sh" >"$work/result" 2>&1
printf 'PASS: Zsh config names are syntax-checked without execution; non-shell files are ignored\n'
