#!/usr/bin/env sh

set -eu

ROOT=$(CDPATH='' cd "$(dirname "$0")" && pwd)
setup_path=$(CDPATH='' cd "$ROOT/../.." && pwd)
PROFILE=${1:-}

if [ -z "$PROFILE" ]; then
  if [ -n "${SSH_CONNECTION:-}" ]; then
    PROFILE=ssh
  else
    PROFILE=local
  fi
fi

PROFILE_FILE="$ROOT/hosts/$PROFILE.jsonc"
if [ ! -f "$PROFILE_FILE" ]; then
  printf 'Unknown OpenCode profile: %s\n' "$PROFILE" >&2
  printf 'Available profiles: local, ssh\n' >&2
  exit 1
fi

CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}/opencode

. "$setup_path/link.sh"

for name in opencode.jsonc tui.json instructions.md package.json agent-permission-boundaries.mjs auto-improve.mjs; do
  link_path "$ROOT/$name" "$CONFIG_HOME/$name"
done

if [ -L "$CONFIG_HOME/pstack-models.md" ] &&
  [ "$(readlink "$CONFIG_HOME/pstack-models.md")" = "$ROOT/pstack-models.md" ]; then
  rm "$CONFIG_HOME/pstack-models.md"
fi

for name in agents skills themes; do
  link_path "$ROOT/$name" "$CONFIG_HOME/$name"
done

link_path "$setup_path/agents/AGENTS.md" "$CONFIG_HOME/AGENTS.md"

link_path "$PROFILE_FILE" "$CONFIG_HOME/host.jsonc"

PLUGIN_HOME="$CONFIG_HOME/plugins/opencode-notify"
if [ ! -e "$PLUGIN_HOME" ] && command -v git >/dev/null 2>&1; then
  mkdir -p "$CONFIG_HOME/plugins"
  git clone --depth 1 https://github.com/davesnx/opencode-notify.git "$PLUGIN_HOME"
fi

if command -v npm >/dev/null 2>&1; then
  npm install --prefix "$CONFIG_HOME" --no-audit --no-fund
fi

printf 'Installed OpenCode profile: %s\n' "$PROFILE"
printf 'Backups, when needed: %s\n' "$SETUP_BACKUP_ROOT"
printf 'Start a new shell and restart OpenCode to load the new configuration.\n'
