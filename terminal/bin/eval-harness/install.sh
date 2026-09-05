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

npm ci --prefix "$ROOT" --no-audit --no-fund

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
