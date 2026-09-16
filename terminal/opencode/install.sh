#!/usr/bin/env sh

. "$DOTFILES_PATH/prelude.sh"
ROOT="$DOTFILES_PATH/terminal/opencode"

need node
PROFILE=$(select_profile "${1:-}")

PROFILE_FILE="$ROOT/hosts/$PROFILE.jsonc"
if [ ! -f "$PROFILE_FILE" ]; then
  printf 'Unknown OpenCode profile: %s\n' "$PROFILE" >&2
  printf 'Available profiles: local, ssh\n' >&2
  exit 1
fi

CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}/opencode

for name in opencode.jsonc tui.json instructions.md package.json agent-permission-boundaries.mjs auto-improve.mjs; do
  link_path "$ROOT/$name" "$CONFIG_HOME/$name"
done

if [ -L "$CONFIG_HOME/pstack-models.md" ] &&
  [ "$(readlink "$CONFIG_HOME/pstack-models.md")" = "$ROOT/pstack-models.md" ]; then
  rm "$CONFIG_HOME/pstack-models.md"
fi

for name in agents skills themes vendor; do
  link_path "$ROOT/$name" "$CONFIG_HOME/$name"
done

link_path "$DOTFILES_PATH/agents/AGENTS.md" "$CONFIG_HOME/AGENTS.md"
node "$ROOT/mcp.ts"
link_path "$ROOT/mcp.json" "$CONFIG_HOME/opencode.json"

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
