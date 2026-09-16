#!/usr/bin/env sh

set -eu

ROOT=$(CDPATH='' cd "$(dirname "$0")" && pwd)
SETUP_ROOT=$(CDPATH='' cd "$ROOT/../../.." && pwd)
BIN_HOME="$HOME/.local/bin"
CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}/opencode

if [ -e "$BIN_HOME/eval-harness" ] && [ ! -L "$BIN_HOME/eval-harness" ]; then
  printf 'Cannot replace eval-harness executable: %s\n' "$BIN_HOME/eval-harness" >&2
  exit 73
fi

for command in bun node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf '%s is required.\n' "$command" >&2
    exit 69
  fi
done

# Restore clean package files before patching without changing Bun's cache.
bun install --cwd "$ROOT" --frozen-lockfile --force --backend=copyfile

mkdir -p "$BIN_HOME"
ln -sfn "$ROOT/eval-harness" "$BIN_HOME/eval-harness"

# Keep installed callers working without creating OpenCode links on new machines.
for name in eval-harness patch-eval-harness; do
  target="$CONFIG_HOME/$name"
  if [ -L "$target" ] && [ "$(readlink "$target")" = "$SETUP_ROOT/terminal/opencode/$name" ]; then
    ln -sfn "$ROOT/$name" "$target"
  fi
done

printf 'Installed eval-harness: %s\n' "$BIN_HOME/eval-harness"
