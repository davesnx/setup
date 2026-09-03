#!/usr/bin/env sh

set -eu

ROOT=$(CDPATH='' cd "$(dirname "$0")" && pwd)
SKILLS_HOME=$(CDPATH='' cd "$ROOT/../../skills" && pwd)
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
AGENTS_HOME="$HOME/.agents"
CLAUDE_HOME="$HOME/.claude"
STAMP=$(date +%Y%m%d%H%M%S)
BACKUP_ROOT=${XDG_STATE_HOME:-"$HOME/.local/state"}/setup/backups/$STAMP

mkdir -p "$CONFIG_HOME" "$AGENTS_HOME" "$CLAUDE_HOME" "$BACKUP_ROOT/opencode"

link_path() {
  source_path=$1
  target_path=$2
  backup_path=$3

  if [ ! -e "$source_path" ]; then
    printf 'Missing setup source: %s\n' "$source_path" >&2
    exit 1
  fi

  if [ -L "$target_path" ] && [ "$(readlink "$target_path")" = "$source_path" ]; then
    return
  fi

  if [ -e "$target_path" ] || [ -L "$target_path" ]; then
    mv "$target_path" "$backup_path"
  fi

  ln -s "$source_path" "$target_path"
}

for name in opencode.jsonc tui.json AGENTS.md pstack-models.md package.json eval-harness; do
  link_path "$ROOT/$name" "$CONFIG_HOME/$name" "$BACKUP_ROOT/opencode/$name"
done

for name in agents commands skills themes; do
  link_path "$ROOT/$name" "$CONFIG_HOME/$name" "$BACKUP_ROOT/opencode/$name"
done

link_path "$ROOT/AGENTS.md" "$AGENTS_HOME/AGENTS.md" "$BACKUP_ROOT/agents-AGENTS.md"
link_path "$ROOT/AGENTS.md" "$CLAUDE_HOME/CLAUDE.md" "$BACKUP_ROOT/claude-CLAUDE.md"
link_path "$SKILLS_HOME" "$AGENTS_HOME/skills" "$BACKUP_ROOT/agents-skills"
link_path "$SKILLS_HOME" "$CLAUDE_HOME/skills" "$BACKUP_ROOT/claude-skills"

link_path "$PROFILE_FILE" "$CONFIG_HOME/host.jsonc" "$BACKUP_ROOT/opencode/host.jsonc"

# Claude Code keeps user-scope MCP servers in ~/.claude.json, so register the
# Chrome DevTools server with the same browser endpoint the OpenCode profile uses.
if command -v claude >/dev/null 2>&1; then
  claude mcp remove -s user chrome-devtools >/dev/null 2>&1 || true
  if [ "$PROFILE" = ssh ]; then
    claude mcp add -s user chrome-devtools -- npx -y chrome-devtools-mcp@1.8.0 \
      --browser-url=http://127.0.0.1:9222 \
      --no-usage-statistics --no-performance-crux --redact-network-headers
  else
    claude mcp add -s user chrome-devtools -- npx -y chrome-devtools-mcp@1.8.0 \
      "--executable-path=/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
      "--user-data-dir=$HOME/.cache/chrome-devtools-mcp/brave-profile" \
      --no-usage-statistics --no-performance-crux --redact-network-headers
  fi
fi

PLUGIN_HOME="$CONFIG_HOME/plugins/opencode-notify"
if [ ! -e "$PLUGIN_HOME" ] && command -v git >/dev/null 2>&1; then
  mkdir -p "$CONFIG_HOME/plugins"
  git clone --depth 1 https://github.com/davesnx/opencode-notify.git "$PLUGIN_HOME"
fi

if command -v npm >/dev/null 2>&1; then
  npm install --prefix "$CONFIG_HOME" --no-audit --no-fund
fi

printf 'Installed OpenCode profile: %s\n' "$PROFILE"
printf 'Backups, when needed: %s\n' "$BACKUP_ROOT"
printf 'Start a new shell and restart OpenCode to load the new configuration.\n'
