#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd "$(dirname "$0")/../../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
export DOTFILES_PATH="$root" TERM=dumb
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME=Test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=Test GIT_COMMITTER_EMAIL=test@example.com
mkdir -p "$work/repo" "$work/tmp" "$work/bin"
export TMPDIR="$work/tmp"

assert_contains() {
  if [[ "$1" != *"$2"* ]]; then
    printf 'Missing <%s> in <%s>\n' "$2" "$1" >&2
    exit 1
  fi
}

git -C "$work/repo" init -q
cd "$work/repo"
paths=('space name' 'quote"name' "\$(touch injected)" 'star*name' plain)
for path in "${paths[@]}"; do printf 'first\n' >"$path"; done
git add -- .
GIT_AUTHOR_DATE='2026-01-01T12:00:00Z' GIT_COMMITTER_DATE='2026-01-01T12:00:00Z' git commit -qm first
printf 'second\n' >>plain
git add -- plain
GIT_AUTHOR_DATE='2026-01-02T12:00:00Z' GIT_COMMITTER_DATE='2026-01-02T12:00:00Z' git commit -qm second

effort="$root/terminal/bin/git-extras/git-effort"
output=$("$BASH" "$effort")
for path in "${paths[@]}"; do assert_contains "$output" "$path"; done
[[ ! -e injected ]]
[[ "$output" != *$'\033'* ]]
[[ "$output" =~ plain\.+[[:space:]]+2[[:space:]]+2 ]]
output=$("$BASH" "$effort" --above 1)
assert_contains "$output" plain
[[ "$output" != *'space name'* ]]
output=$("$BASH" "$effort" 'space name')
assert_contains "$output" 'space name'
[[ "$output" != *plain* ]]
output=$("$BASH" "$effort" -- --since=2026-01-02T00:00:00Z)
assert_contains "$output" plain
[[ "$output" != *'space name'* ]]
if "$BASH" "$effort" --above invalid >"$work/error" 2>&1; then exit 1; fi
if "$BASH" "$effort" -- --invalid-git-option >"$work/error" 2>&1; then exit 1; fi
[[ -z "$(find "$TMPDIR" -type f -print)" ]]
if (cd "$work" && "$BASH" "$effort") >"$work/error" 2>&1; then exit 1; fi
[[ -z "$(find "$TMPDIR" -type f -print)" ]]

cat >"$work/bin/date" <<'EOF'
#!/bin/sh
printf 'Mon\n'
EOF
chmod +x "$work/bin/date"
PATH="$work/bin:$PATH" "$BASH" "$root/terminal/bin/git-extras/git-standup" >"$work/standup"

mkdir -p -- 'dir with spaces' '-leading-dash'
touch -- 'dir with spaces/one' $'dir with spaces/two\nlines' '-leading-dash/one'
output=$("$BASH" "$root/terminal/bin/fs/count_files_recursive_per_directory")
assert_contains "$output" 'dir with spaces/ 2'
assert_contains "$output" '-leading-dash/ 1'

mkdir "$work/empty"
git -C "$work/empty" init -q
output=$(cd "$work/empty" && "$BASH" "$effort")
assert_contains "$output" 'active days'

printf 'PASS: Git and filesystem commands\n'
