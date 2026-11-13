#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
command=$root/cursor-diff
bash_bin=$BASH
git_dir=$(dirname -- "$(type -P git)")
scratch=$(mktemp -d "${TMPDIR:-/tmp}/cursor-diff-test.XXXXXXXX")
trap 'rm -rf -- "$scratch"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
home=$scratch/home
runtime=$scratch/runtime
mkdir -p "$home" "$runtime" "$scratch/tmp" "$scratch/path" "$scratch/outside"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

fake_cli() {
  mkdir -p "$(dirname -- "$1")"
  cat >"$1" <<SH
#!/bin/sh
printf '%s %s %s %s\n' '$2' "\$VSCODE_IPC_HOOK_CLI" "\$2" "\$3" >>"$scratch/log"
[ "\$1" = --diff ] && [ \$# -eq 3 ] || exit 64
case \${VSCODE_IPC_HOOK_CLI##*/} in
  *good*) exit 0 ;;
esac
printf 'Unable to connect to VS Code server\n' >&2
exit 1
SH
  chmod +x "$1"
}
fake_cli "$home/.cursor-server/bin/flat/bin/remote-cli/cursor" flat
fake_cli "$home/.cursor-server/bin/linux-x64/nested/bin/remote-cli/cursor" nested
fake_cli "$scratch/path/cursor" path
touch -t 202001010000 "$home/.cursor-server/bin/flat/bin/remote-cli"

: >"$runtime/vscode-ipc-old-stale.sock"
: >"$runtime/vscode-ipc-good.sock"
: >"$runtime/vscode-ipc-new-stale.sock"
touch -t 202001010000 "$runtime/vscode-ipc-old-stale.sock"
touch -t 202001010100 "$runtime/vscode-ipc-good.sock"
touch -t 202001010200 "$runtime/vscode-ipc-new-stale.sock"

repo=$scratch/repo
mkdir -p "$repo/dir"
git_env=(GIT_CONFIG_NOSYSTEM=1 GIT_CEILING_DIRECTORIES="$scratch" GIT_AUTHOR_NAME=t
  GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t)
g() {
  env HOME="$home" "${git_env[@]}" git -C "$repo" "$@" >/dev/null
}
g init -q
printf 'old\n' >"$repo/mod.txt"
printf 'gone\n' >"$repo/gone.txt"
printf 'same\n' >"$repo/same.txt"
printf 'moving\n' >"$repo/orig.txt"
g add .
g commit -q -m init
printf 'new\n' >"$repo/mod.txt"
rm "$repo/gone.txt"
printf 'added\n' >"$repo/dir/new.txt"
g add dir/new.txt
g mv orig.txt moved.txt
printf 'loose\n' >"$repo/untracked.txt"

run() {
  local dir=$1
  shift
  : >"$scratch/log"
  (cd "$dir" && env -i HOME="$home" PATH="$git_dir:/usr/bin:/bin" TMPDIR="$scratch/tmp" \
    XDG_RUNTIME_DIR="$runtime" "${git_env[@]}" "$@") >"$scratch/out" 2>"$scratch/err"
}
expect_log() {
  local expected
  expected=$(printf '%s\n' "$@")
  [[ $(<"$scratch/log") == "$expected" ]] || fail "calls:
$(<"$scratch/log")
expected:
$expected"
}

run "$repo" "$bash_bin" "$command" || fail "all changes: $(<"$scratch/err")"
store=$(printf '%s\n' "$scratch"/tmp/cursor-diff/repo-*)
[[ -d $store ]] || fail "missing store: $store"
stale=$runtime/vscode-ipc-new-stale.sock
good=$runtime/vscode-ipc-good.sock
expect_log \
  "nested $stale $store/HEAD/dir/new.txt $repo/dir/new.txt" \
  "nested $good $store/HEAD/dir/new.txt $repo/dir/new.txt" \
  "nested $good $store/HEAD/gone.txt $store/deleted/gone.txt" \
  "nested $good $store/HEAD/mod.txt $repo/mod.txt" \
  "nested $good $store/HEAD/moved.txt $repo/moved.txt" \
  "nested $good $store/HEAD/orig.txt $store/deleted/orig.txt"
[[ ! -s $store/HEAD/moved.txt && $(<"$store/HEAD/orig.txt") == moving ]] || fail 'rename sides'
[[ -f $store/HEAD/dir/new.txt && ! -s $store/HEAD/dir/new.txt ]] || fail 'new file left side not empty'
[[ $(<"$store/HEAD/gone.txt") == gone ]] || fail 'deleted file left side'
[[ -f $store/deleted/gone.txt && ! -s $store/deleted/gone.txt ]] || fail 'deleted file right side not empty'
[[ $(<"$store/HEAD/mod.txt") == old ]] || fail 'modified file left side'
[[ ! -e $store/HEAD/untracked.txt ]] || fail 'untracked file opened'

printf 'changed\n' >"$store/HEAD/mod.txt"
run "$repo/dir" "$bash_bin" "$command" ../mod.txt || fail "path filter: $(<"$scratch/err")"
expect_log \
  "nested $stale $store/HEAD/mod.txt $repo/mod.txt" \
  "nested $good $store/HEAD/mod.txt $repo/mod.txt"
[[ $(<"$store/HEAD/mod.txt") == old ]] || fail 'left side not overwritten'

run "$repo/dir" "$bash_bin" "$command" -- . || fail "directory filter: $(<"$scratch/err")"
expect_log \
  "nested $stale $store/HEAD/dir/new.txt $repo/dir/new.txt" \
  "nested $good $store/HEAD/dir/new.txt $repo/dir/new.txt"

run "$repo" "$bash_bin" "$command" same.txt untracked.txt || fail 'no changes failed'
[[ ! -s $scratch/log ]] || fail 'no changes opened a diff'
grep -q '^No changes' "$scratch/out" || fail 'no changes message'

run "$repo" VSCODE_IPC_HOOK_CLI="$good" PATH="$scratch/path:$git_dir:/usr/bin:/bin" "$bash_bin" "$command" mod.txt ||
  fail "integrated terminal: $(<"$scratch/err")"
expect_log "path $good $store/HEAD/mod.txt $repo/mod.txt"

run "$repo" PATH="$scratch/path:$git_dir:/usr/bin:/bin" "$bash_bin" "$command" mod.txt ||
  fail "cursor without socket: $(<"$scratch/err")"
expect_log \
  "nested $stale $store/HEAD/mod.txt $repo/mod.txt" \
  "nested $good $store/HEAD/mod.txt $repo/mod.txt"

rm -r "$home/.cursor-server/bin/linux-x64"
run "$repo" "$bash_bin" "$command" mod.txt || fail "flat layout: $(<"$scratch/err")"
expect_log \
  "flat $stale $store/HEAD/mod.txt $repo/mod.txt" \
  "flat $good $store/HEAD/mod.txt $repo/mod.txt"

rm "$good"
if run "$repo" "$bash_bin" "$command" mod.txt; then fail 'accepted only stale sockets'; fi
grep -q "$stale" "$scratch/err" || fail 'stale socket not named'
grep -q 'Unable to connect' "$scratch/err" || fail 'CLI error not shown'

rm "$runtime"/vscode-ipc-*.sock
if run "$repo" "$bash_bin" "$command" mod.txt; then fail 'accepted no sockets'; fi
grep -q 'vscode-ipc' "$scratch/err" || fail 'missing sockets not named'

rm -r "$home/.cursor-server"
if run "$repo" "$bash_bin" "$command" mod.txt; then fail 'accepted no CLI'; fi
grep -q 'remote-cli' "$scratch/err" || fail 'missing CLI not named'

if run "$scratch/outside" "$bash_bin" "$command"; then fail 'accepted outside a repository'; fi
grep -q 'not inside a Git worktree' "$scratch/err" || fail 'outside error'

run "$scratch/outside" "$bash_bin" "$command" --help || fail 'help failed'
grep -q '^Usage: cursor-diff' "$scratch/out" || fail 'help missing'
printf 'cursor-diff tests passed.\n'
