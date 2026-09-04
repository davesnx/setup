#!/usr/bin/env bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title nspawn
# @raycast.mode silent

# Optional parameters:
# @raycast.packageName Terminal
# @raycast.description Open a Ghostty window attached to the tmux session on nspawn.

set -euo pipefail

host="${1:-nspawn}"
session="${2:-main}"

log_dir="$HOME/Library/Logs/ghostty-remote"
log_file="$log_dir/$host.log"
cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/ghostty-remote"
cache_file="$cache_dir/$host.window"
wrapper_bin="$HOME/.local/bin/ghostty-remote-tmux"
err_file=""

mkdir -p "$log_dir" "$cache_dir"

log() {
  printf '%s [raycast %s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$$" "$1" >>"$log_file"
}

fail() {
  log "ERROR: $1"
  printf '%s\n' "$1 (see $log_file)"
  exit 1
}

on_exit() {
  local ec=$?
  [ -n "$err_file" ] && rm -f "$err_file" 2>/dev/null
  log "exit status=$ec"
}

on_err() {
  local line=$1
  local status=$?
  log "ERROR: command failed: ${BASH_COMMAND} (line $line, exit $status)"
  printf '%s\n' "nspawn: unexpected error (see $log_file)"
  exit "$status"
}

trap on_exit EXIT
trap 'on_err $LINENO' ERR

rotate_log() {
  if [ -f "$log_file" ]; then
    size=$(wc -c <"$log_file" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$size" ] && [ "$size" -gt 1048576 ]; then
      mv -f "$log_file" "$log_file.1"
    fi
  fi
}

# AppleScript string literals need their own backslash/quote escaping,
# separate from the shell quoting already applied to the command text.
as_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

run_osascript() {
  script=$1
  : >"$err_file"
  printf '%s\n' "$script" | osascript 2>"$err_file"
}

log_osascript_stderr() {
  err_content=$(cat "$err_file" 2>/dev/null || true)
  if [ -n "$err_content" ]; then
    log "osascript stderr: $err_content"
  fi
  printf '%s' "$err_content"
}

# `exists` is the documented way to test for a missing AppleScript object
# without raising an error, so a closed window reports false, not a fault.
check_window_exists() {
  id=$1
  script=$(printf 'tell application id "com.mitchellh.ghostty" to exists (first window whose id is "%s")' "$id")
  if ! result=$(run_osascript "$script"); then
    err_content=$(log_osascript_stderr)
    first_line=$(printf '%s\n' "$err_content" | head -n1)
    fail "Could not check the Ghostty window state${first_line:+: $first_line}"
  fi
  log_osascript_stderr >/dev/null
  [ "$result" = "true" ]
}

activate_window() {
  id=$1
  script=$(printf 'tell application id "com.mitchellh.ghostty" to activate window (first window whose id is "%s")' "$id")
  if ! run_osascript "$script" >/dev/null; then
    err_content=$(log_osascript_stderr)
    first_line=$(printf '%s\n' "$err_content" | head -n1)
    fail "Could not activate the Ghostty window${first_line:+: $first_line}"
  fi
  log_osascript_stderr >/dev/null
}

open_new_window() {
  remote_cmd="\"$wrapper_bin\" \"$host\" \"$session\""
  cmd_literal=$(as_escape "$remote_cmd")
  script=$(cat <<APPLESCRIPT
tell application id "com.mitchellh.ghostty"
  set cfg to new surface configuration
  set command of cfg to "$cmd_literal"
  set wait after command of cfg to false
  set w to new window with configuration cfg
  activate window w
  return id of w as text
end tell
APPLESCRIPT
)
  if ! new_id=$(run_osascript "$script"); then
    err_content=$(log_osascript_stderr)
    first_line=$(printf '%s\n' "$err_content" | head -n1)
    fail "Could not open a Ghostty window${first_line:+: $first_line}"
  fi
  log_osascript_stderr >/dev/null
  printf '%s' "$new_id"
}

rotate_log
log "start host=$host session=$session"

if [ ! -x "$wrapper_bin" ]; then
  fail "ghostty-remote-tmux is not installed at $wrapper_bin; run mac/install.sh"
fi

err_file=$(mktemp "${TMPDIR:-/tmp}/ghostty-remote-nspawn.XXXXXX")

cached_id=""
if [ -f "$cache_file" ]; then
  cached_id=$(cat "$cache_file" 2>/dev/null || true)
fi

if [ -n "$cached_id" ] && check_window_exists "$cached_id"; then
  log "reusing window id=$cached_id"
  activate_window "$cached_id"
  exit 0
fi

if [ -n "$cached_id" ]; then
  log "cached window id=$cached_id is stale"
else
  log "no cached window"
fi

new_id=$(open_new_window)
printf '%s' "$new_id" >"$cache_file"
log "created window id=$new_id"
