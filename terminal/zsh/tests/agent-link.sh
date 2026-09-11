#!/bin/sh

set -eu

root=$(CDPATH='' cd "$(dirname "$0")/../../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

mkdir -p "$work/.ssh"
ln -s "$root/terminal/zsh/.zshenv" "$work/.zshenv"
link="$work/.ssh/agent.sock"
sock="$work/agent.real"
# Bind relative to the directory: Unix socket paths are limited to ~104 bytes
# at bind time, but the resulting file works at any absolute path.
(cd "$work" && python3 -c 'import socket; socket.socket(socket.AF_UNIX).bind("agent.real")')

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

# Runs a zsh with only the given environment and prints the SSH_AUTH_SOCK it
# ends up with, so each case sees exactly the login environment it describes.
seen() {
  env -i HOME="$work" PATH="$PATH" "$@" zsh -c 'printenv SSH_AUTH_SOCK'
}

[ "$(seen SSH_CONNECTION=x SSH_AUTH_SOCK="$sock")" = "$link" ] || fail "did not switch to the link"
[ "$(readlink "$link")" = "$sock" ] || fail "did not link the live socket"
echo "PASS: links a live forwarded socket and uses the link"

[ "$(seen SSH_CONNECTION=x SSH_AUTH_SOCK="$work/missing")" = "$link" ] || fail "did not fall back to the link"
[ "$(readlink "$link")" = "$sock" ] || fail "a dead path replaced the link"
echo "PASS: keeps the link when the inherited socket is dead"

[ "$(seen SSH_CONNECTION=x SSH_AUTH_SOCK="$link")" = "$link" ] || fail "changed an already linked value"
[ "$(readlink "$link")" = "$sock" ] || fail "the link points at itself"
echo "PASS: never points the link at itself"

[ "$(seen SSH_AUTH_SOCK="$sock")" = "$sock" ] || fail "touched SSH_AUTH_SOCK without SSH_CONNECTION"
echo "PASS: does nothing outside an SSH session"

zsh_bin=$(command -v zsh)
actual=$(env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -c 'printenv PATH')
[ "$actual" = "$work/.local/bin:/usr/bin:/bin" ] || fail "non-login shell PATH misses local binaries"
echo "PASS: non-login shells prepend local binaries to inherited PATH"

inherited="/usr/bin:$work/.local/bin:/bin"
actual=$(env -i HOME="$work" PATH="$inherited" "$zsh_bin" -c 'source ~/.zshenv; printenv PATH')
[ "$actual" = "$inherited" ] || fail "repeated loading changed an existing local bin entry"
echo "PASS: repeated loading preserves an existing local bin entry"

inherited="$work/.local/bin-other:/usr/bin:/bin"
actual=$(env -i HOME="$work" PATH="$inherited" "$zsh_bin" -c 'printenv PATH')
[ "$actual" = "$work/.local/bin:$inherited" ] || fail "similar path prevented local bin insertion"
echo "PASS: local bin matching uses whole PATH entries"

mkdir -p "$work/.local/bin"
ln -s /bin/true "$work/.local/bin/setup-path-probe"
env -i HOME="$work" PATH=/usr/bin:/bin SSH_CONNECTION=x "$zsh_bin" -c \
  'setup-path-probe' || fail "non-login SSH command could not find local binaries"
echo "PASS: non-login SSH commands can run local binaries"

ln -s "$root/terminal/zsh/.zprofile" "$work/.zprofile"
env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -lc \
  'setup-path-probe' || fail "login shell PATH misses local binaries"
echo "PASS: login shells can run local binaries"
