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
[ "$actual" = /usr/bin:/bin ] || fail "non-login shell changed PATH"
echo "PASS: non-login shells preserve inherited PATH"

ln -s "$root/terminal/zsh/.zprofile" "$work/.zprofile"
env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -lc \
  '[[ ":$PATH:" == *":$HOME/.local/bin:"* ]]' || fail "login shell PATH misses local binaries"
echo "PASS: login shells load local binaries from .zprofile"
