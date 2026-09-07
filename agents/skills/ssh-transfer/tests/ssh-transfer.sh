#!/bin/bash

set -euo pipefail

setup=$(CDPATH='' cd "$(dirname "$0")/../../../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
trap 'exit 130' INT
trap 'exit 143' HUP TERM
transfer="$setup/terminal/bin/ssh-transfer"
real_rsync=$(command -v rsync) || {
  printf 'Tests require real rsync 3 or newer.\n' >&2
  exit 1
}
mkdir -p "$work/bin" "$work/no-rsync" "$work/no-ssh"
export ARGS_LOG="$work/args" CALL_LOG="$work/calls"

cat >"$work/bin/rsync" <<'EOF'
#!/bin/bash
printf 'rsync\n' >>"$CALL_LOG"
if [ "$1" = --version ]; then
  printf '%s\n' "${RSYNC_VERSION:-rsync  version 3.2.7  protocol version 32}"
  exit 0
fi
printf '%s\0' "$@" >"$ARGS_LOG"
exit "${RSYNC_STATUS:-0}"
EOF
cat >"$work/bin/ssh" <<'EOF'
#!/bin/bash
printf 'ssh\n' >>"$CALL_LOG"
exit 99
EOF
chmod +x "$work/bin/rsync" "$work/bin/ssh"
ln -s "$work/bin/rsync" "$work/no-ssh/rsync"
ln -s "$work/bin/ssh" "$work/no-rsync/ssh"

expect_exit() {
  local expected=$1 actual=0
  shift
  : >"$CALL_LOG"
  "$@" >"$work/stdout" 2>"$work/stderr" || actual=$?
  if [ "$actual" -ne "$expected" ]; then
    printf 'expected exit %s, got %s: %s\n' "$expected" "$actual" "$*" >&2
    cat "$work/stdout" "$work/stderr" >&2
    exit 1
  fi
}

expect_args() {
  printf '%s\0' -rlt --protect-args --human-readable --progress \
    --partial-dir=.rsync-partial '--rsh=ssh -o ClearAllForwardings=yes' \
    "$@" >"$work/expected"
  cmp "$work/expected" "$ARGS_LOG"
  [ "$(cat "$CALL_LOG")" = $'rsync\nrsync' ]
}

for option in -h --help; do
  expect_exit 0 env PATH="$work/bin:/usr/bin:/bin" "$transfer" "$option"
  grep -q '^Usage: ssh-transfer' "$work/stdout"
  grep -q 'remote HOME' "$work/stdout"
  grep -Fq 'Remote paths cannot contain *, ?, [, ], or backslash' "$work/stdout"
  [ ! -s "$CALL_LOG" ]
done
for arguments in '' push pull send --unknown --host; do
  expect_exit 64 env PATH="$work/bin" "$transfer" "$arguments"
  [ ! -s "$CALL_LOG" ]
done
expect_exit 64 env PATH="$work/bin" "$transfer"
expect_exit 64 env PATH="$work/bin" "$transfer" push a
expect_exit 64 env PATH="$work/bin" "$transfer" pull a b c
expect_exit 64 env PATH="$work/bin" "$transfer" push a b --dry-run
expect_exit 64 env PATH="$work/bin" "$transfer" pull --host server a b
expect_exit 64 env PATH="$work/bin" "$transfer" push '' b
expect_exit 64 env PATH="$work/bin" "$transfer" pull a ''
for host in '' -nspawn 'user@nspawn' 'host:22' 'host/path' 'host name' 'host;id' $'host\nname'; do
  expect_exit 64 env PATH="$work/bin" "$transfer" --host "$host" push a b
  [ ! -s "$CALL_LOG" ]
done
printf 'PASS: help and argument validation\n'

names=('*' '?' '[' ']' "\\" 'x\y' '[ab].txt' '\[ab]*?')
for name in "${names[@]}"; do
  for remote in "$name" "parent/$name/child" "/parent/$name/"; do
    for bin in "$work/bin" "$work/no-rsync"; do
      expect_exit 64 env PATH="$bin" "$transfer" push local "$remote"
      grep -Fq 'copy the parent directory instead' "$work/stderr"
      [ ! -s "$CALL_LOG" ]
      expect_exit 64 env PATH="$bin" "$transfer" pull "$remote" local
      grep -Fq 'copy the parent directory instead' "$work/stderr"
      [ ! -s "$CALL_LOG" ]
    done
  done
  expect_exit 0 env PATH="$work/bin" "$transfer" push "$name" safe
  expect_args -- "./$name" nspawn:./safe
  expect_exit 0 env PATH="$work/bin" "$transfer" pull safe "$name"
  expect_args -- nspawn:./safe "./$name"
done
printf 'PASS: remote special paths rejected before dependencies; local paths allowed\n'

expect_exit 69 env PATH="$work/no-rsync" "$transfer" push a b
grep -q 'brew install rsync' "$work/stderr"
[ ! -s "$CALL_LOG" ]
expect_exit 69 env PATH="$work/no-ssh" "$transfer" pull a b
grep -q 'ssh is required' "$work/stderr"
[ ! -s "$CALL_LOG" ]
for version in 'rsync  version 2.6.9  protocol version 29' 'not rsync'; do
  expect_exit 69 env PATH="$work/bin" RSYNC_VERSION="$version" "$transfer" push a b
  grep -q 'brew install rsync' "$work/stderr"
  [ "$(cat "$CALL_LOG")" = rsync ]
done
printf 'PASS: missing dependencies and unsupported rsync\n'

expect_exit 0 env PATH="$work/bin" "$transfer" push 'local dir/' 'remote dir/'
expect_args -- './local dir/' 'nspawn:./remote dir/'
expect_exit 0 env PATH="$work/bin" "$transfer" --host test-host_1.example pull '/remote dir/' '/local dir/'
expect_args -- 'test-host_1.example:/remote dir/' '/local dir/'
for path in "a 'quoted' \"file\"" '-leading' 'host:file' ':module' './already/' '../parent/' "literal;\$(id)" \~/literal; do
  normalized=./$path
  case "$path" in ./*) normalized=$path ;; esac
  expect_exit 0 env PATH="$work/bin" "$transfer" push "$path" "$path"
  expect_args -- "$normalized" "nspawn:$normalized"
  expect_exit 0 env PATH="$work/bin" "$transfer" pull "$path" "$path"
  expect_args -- "nspawn:$normalized" "$normalized"
done
for action in push pull; do
  expect_exit 0 env PATH="$work/bin" "$transfer" --dry-run --host example "$action" a b
  if [ "$action" = push ]; then
    expect_args --dry-run --itemize-changes -- ./a example:./b
  else
    expect_args --dry-run --itemize-changes -- example:./a ./b
  fi
  expect_exit 23 env PATH="$work/bin" RSYNC_STATUS=23 "$transfer" "$action" a b
done
printf 'PASS: push, pull, exact arguments, dry-run, and exit status\n'

mkdir -p "$work/real-bin" "$work/remote-home" "$work/local"
export REAL_RSYNC="$real_rsync" REMOTE_HOME="$work/remote-home"
ln -s "$real_rsync" "$work/real-bin/rsync"
cat >"$work/real-bin/ssh" <<'EOF'
#!/bin/bash
set -euo pipefail
[ "$1" = -o ] && [ "$2" = ClearAllForwardings=yes ] && [ "$3" = nspawn ] || exit 98
shift 3
[ "$1" = rsync ] || exit 98
shift
cd "$REMOTE_HOME"
exec "$REAL_RSYNC" "$@"
EOF
chmod +x "$work/real-bin/ssh"

# No real ssh is on this PATH. Both rsync processes use only temporary data.
cd "$work/local"
name="-file: 'single' \"double\"; \$(touch INJECTED)"
mkdir 'source dir' "$REMOTE_HOME/destination" 'pulled'
printf 'new source contents\n' >"source dir/$name"
printf 'keep remote\n' >"$REMOTE_HOME/destination/unrelated"
printf 'old\n' >"$REMOTE_HOME/destination/$name"
touch -t 202001020304 "source dir/$name"
ln -s "./$name" 'source dir/link'
expect_exit 0 env PATH="$work/real-bin" "$transfer" push 'source dir/' destination/
cmp "source dir/$name" "$REMOTE_HOME/destination/$name"
[ "$(readlink "$REMOTE_HOME/destination/link")" = "./$name" ]
[ ! "source dir/$name" -nt "$REMOTE_HOME/destination/$name" ]
[ ! "$REMOTE_HOME/destination/$name" -nt "source dir/$name" ]
grep -qx 'keep remote' "$REMOTE_HOME/destination/unrelated"
[ ! -e "$REMOTE_HOME/destination/source dir" ]
[ ! -e "$REMOTE_HOME/INJECTED" ]
expect_exit 0 env PATH="$work/real-bin" "$transfer" push 'source dir' destination/
cmp "source dir/$name" "$REMOTE_HOME/destination/source dir/$name"

printf 'keep local\n' >pulled/unrelated
printf 'old\n' >"pulled/$name"
expect_exit 0 env PATH="$work/real-bin" "$transfer" pull 'destination/source dir/' pulled/
cmp "source dir/$name" "pulled/$name"
[ "$(readlink pulled/link)" = "./$name" ]
grep -qx 'keep local' pulled/unrelated
[ ! -e 'pulled/source dir' ]
expect_exit 0 env PATH="$work/real-bin" "$transfer" pull 'destination/source dir' pulled/
cmp "source dir/$name" "pulled/source dir/$name"
[ ! -e INJECTED ]
printf 'PASS: real rsync both directions, trailing slash, links, times, overwrite, no delete\n'

for path in '-leading' 'host:file' ':module' "space 'quote' \"double\""; do
  printf 'path test\n' >"./$path"
  expect_exit 0 env PATH="$work/real-bin" "$transfer" push "$path" "$path"
  cmp "./$path" "$REMOTE_HOME/$path"
  printf 'changed remote contents\n' >"$REMOTE_HOME/$path"
  expect_exit 0 env PATH="$work/real-bin" "$transfer" pull "$path" "$path"
  cmp "$REMOTE_HOME/$path" "./$path"
done
expect_exit 0 env PATH="$work/real-bin" "$transfer" push "$work/local/host:file" "$REMOTE_HOME/absolute:file"
expect_exit 0 env PATH="$work/real-bin" "$transfer" pull "$REMOTE_HOME/absolute:file" "$work/local/absolute:file"
cmp './host:file' './absolute:file'
printf 'PASS: real rsync special characters and absolute paths\n'

mkdir -p safe-parent/files parent-copy local-file-targets local-dir-targets
for name in "${names[@]}" 'a.txt' 'a' 'xy' 'ordinary'; do
  mkdir -p "safe-parent/dirs/$name/nested"
  printf 'file: %s\n' "$name" >"safe-parent/files/$name"
  printf 'directory: %s\n' "$name" >"safe-parent/dirs/$name/nested/content"
done
expect_exit 0 env PATH="$work/real-bin" "$transfer" push safe-parent/ safe-parent/
diff -r safe-parent "$REMOTE_HOME/safe-parent"
expect_exit 0 env PATH="$work/real-bin" "$transfer" pull safe-parent/ parent-copy/
diff -r safe-parent parent-copy
printf 'PASS: real rsync parent copies preserve special child names and decoys both ways\n'

for index in "${!names[@]}"; do
  name=${names[$index]}
  expect_exit 0 env PATH="$work/real-bin" "$transfer" push "safe-parent/files/$name" "local-file-$index"
  cmp "safe-parent/files/$name" "$REMOTE_HOME/local-file-$index"
  expect_exit 0 env PATH="$work/real-bin" "$transfer" pull "local-file-$index" "local-file-targets/$name"
  cmp "safe-parent/files/$name" "local-file-targets/$name"
  expect_exit 0 env PATH="$work/real-bin" "$transfer" push "safe-parent/dirs/$name/" "local-dir-$index/"
  diff -r "safe-parent/dirs/$name" "$REMOTE_HOME/local-dir-$index"
  expect_exit 0 env PATH="$work/real-bin" "$transfer" pull "local-dir-$index/" "local-dir-targets/$name/"
  diff -r "safe-parent/dirs/$name" "local-dir-targets/$name"
done
printf 'PASS: real rsync accepts special local file and directory operands both ways\n'

for action in push pull; do
  mkdir -p "$work/local/dry-source" "$work/local/dry-target" \
    "$REMOTE_HOME/dry-source" "$REMOTE_HOME/dry-target"
  printf 'source replacement contents\n' >dry-source/existing
  printf 'new file\n' >dry-source/new
  cp dry-source/* "$REMOTE_HOME/dry-source/"
  printf 'original contents\n' >dry-target/existing
  printf 'keep\n' >dry-target/unrelated
  cp -p dry-target/* "$REMOTE_HOME/dry-target/"
  cp -Rp dry-target "$work/before-$action"
  expect_exit 0 env PATH="$work/real-bin" "$transfer" --dry-run "$action" dry-source/ dry-target/
  grep -q 'existing' "$work/stdout"
  grep -q 'new' "$work/stdout"
  diff -r "$work/before-$action" dry-target
  diff -r "$work/before-$action" "$REMOTE_HOME/dry-target"
  [ ! dry-target/existing -nt "$work/before-$action/existing" ]
  [ ! "$work/before-$action/existing" -nt dry-target/existing ]
  [ ! "$REMOTE_HOME/dry-target/existing" -nt "$work/before-$action/existing" ]
  [ ! "$work/before-$action/existing" -nt "$REMOTE_HOME/dry-target/existing" ]
done
printf 'PASS: real rsync dry-run leaves files unchanged in both directions\n'
