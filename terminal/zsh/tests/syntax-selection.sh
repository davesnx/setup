#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/repo/terminal/zsh" "$work/bin"
cp "$root/check.sh" "$work/repo/check.sh"
git -C "$work/repo" init -q
for tool in git zsh dirname; do
  ln -s "$(command -v "$tool")" "$work/bin/$tool"
done
cat >"$work/bin/shellcheck" <<'EOF'
#!/bin/sh
printf '%s\n' "$@" >>"$SHELLCHECK_LOG"
exit "${SHELLCHECK_STATUS:-0}"
EOF
chmod +x "$work/bin/shellcheck"

run_check() {
  check_status=0
  PATH="$work/bin" SHELLCHECK_LOG="$work/shellcheck-log" "$BASH" "$work/repo/check.sh" "$@" >"$work/result" 2>&1 || check_status=$?
}

expect_status() {
  if [[ "$check_status" != "$1" ]]; then
    printf 'FAIL: %s (expected %s, got %s)\n' "$2" "$1" "$check_status" >&2
    cat "$work/result" >&2
    exit 1
  fi
}

run_check --shell-only
expect_status 0 '--shell-only works with only Git, ShellCheck, Zsh, and base utilities'
grep -q '^Checked ' "$work/result"
printf 'PASS: --shell-only works with minimal dependencies\n'

run_check
expect_status 69 'default mode still requires the full tool set'
grep -q '^shfmt is required' "$work/result"

run_check --help
expect_status 0 'help works with minimal dependencies'
grep -q -- '--shell-only' "$work/result"
for argument in --unknown positional; do
  run_check "$argument"
  expect_status 64 'unknown arguments are rejected'
done
for argument in --shell-only --help; do
  run_check "$argument" extra
  expect_status 64 'extra arguments are rejected'
done
printf 'PASS: default dependencies, help, and argument validation\n'

for name in .zimrc .zshenv .zshrc .zprofile .zlogin .zlogout; do
  file="$work/repo/terminal/zsh/$name"
  printf 'printf executed >"%s/unexpected-execution"\nif then\n' "$work" >"$file"
  run_check --shell-only
  expect_status 1 "invalid Zsh in $name is rejected"
  grep -q "$name" "$work/result"
  [[ ! -e "$work/unexpected-execution" ]]
  printf 'printf executed >"%s/unexpected-execution"\n' "$work" >"$file"
  run_check --shell-only
  expect_status 0 "valid Zsh in $name is accepted"
  [[ ! -e "$work/unexpected-execution" ]]
  if grep -Fq "$file" "$work/shellcheck-log"; then
    printf 'FAIL: Zsh config sent to ShellCheck: %s\n' "$name" >&2
    exit 1
  fi
  rm "$file"
done
printf 'if then\n' >"$work/repo/notes.txt"
printf '#!/usr/bin/env node\nif then\n' >"$work/repo/non-shell.sh"
run_check --shell-only
expect_status 0 'non-shell files are ignored'
if grep -Eq '/(notes.txt|non-shell.sh)$' "$work/shellcheck-log"; then
  printf 'FAIL: non-shell file sent to ShellCheck\n' >&2
  exit 1
fi
printf 'PASS: Zsh config names are syntax-checked without execution; non-shell files are ignored\n'

printf '#!/bin/sh\nexit 0\n' >"$work/repo/command"
printf '# shellcheck shell=sh\ntrue\n' >"$work/repo/sourced"
printf 'true\n' >"$work/repo/prelude.sh"
printf 'true\n' >"$work/repo/helper.sh"
printf '#!/usr/bin/env zsh\nif then\n' >"$work/repo/zsh-command"
run_check --shell-only
expect_status 1 'extensionless Zsh commands are syntax-checked'
rm "$work/repo/zsh-command"
printf 'if then\n' >"$work/repo/helper.zsh"
run_check --shell-only
expect_status 1 '.zsh files are syntax-checked'
rm "$work/repo/helper.zsh"
run_check --shell-only
expect_status 0 'shell commands and sourced files are accepted'
for name in command sourced prelude.sh helper.sh; do
  grep -Fq "$work/repo/$name" "$work/shellcheck-log"
done
grep -q -- '--shell=sh' "$work/shellcheck-log"
grep -q -- '--shell=bash' "$work/shellcheck-log"
printf 'PASS: shell and Zsh discovery retains the original file distinctions\n'

for tool in shfmt bun node npm python3 jq; do
  run_check
  expect_status 69 "default mode requires $tool"
  grep -q "^$tool is required" "$work/result"
  printf '#!/bin/sh\nprintf "unexpected full check\\n" >&2\nexit 97\n' >"$work/bin/$tool"
  chmod +x "$work/bin/$tool"
done
run_check
expect_status 97 'default mode reaches formatting after successful shell validation'

export SHELLCHECK_STATUS=7
run_check --shell-only
expect_status 1 'ShellCheck failure makes --shell-only fail'
run_check
expect_status 1 'default mode stops after shell validation fails'
if grep -q 'unexpected full check' "$work/result"; then
  printf 'FAIL: default mode continued after shell validation failed\n' >&2
  exit 1
fi
unset SHELLCHECK_STATUS
printf 'if then\n' >"$work/repo/terminal/zsh/.zimrc"
run_check
expect_status 1 'default mode stops after Zsh validation fails'
grep -q '.zimrc' "$work/result"
if grep -q 'unexpected full check' "$work/result"; then
  printf 'FAIL: default mode continued after Zsh validation failed\n' >&2
  exit 1
fi
rm "$work/repo/terminal/zsh/.zimrc"
run_check --shell-only
expect_status 0 '--shell-only succeeds after a failed run'
printf 'PASS: ShellCheck failure propagates, stops default checks, and permits a clean retry\n'
