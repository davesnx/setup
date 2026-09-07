#!/bin/sh

set -eu

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)

PROFILE=${1:-}

if [ -z "$PROFILE" ]; then
  if [ -n "${SSH_CONNECTION:-}" ]; then
    PROFILE=ssh
  else
    PROFILE=local
  fi
fi

. "$setup_path/link.sh"

link_path "$setup_path/terminal/claude/settings.json" "$HOME/.claude/settings.json"
link_path "$setup_path/terminal/claude/statusline.ts" "$HOME/.claude/statusline.ts"

if [ -f "$setup_path/terminal/claude/settings.local.json" ]; then
  link_path "$setup_path/terminal/claude/settings.local.json" "$HOME/.claude/settings.local.json"
fi

link_path "$setup_path/agents/AGENTS.md" "$HOME/.claude/CLAUDE.md"
link_path "$setup_path/agents/skills" "$HOME/.claude/skills"

# Puppet installs the real dcg wrapper at this path on nspawn; link the no-op
# stand-in only where nothing is there yet.
mkdir -p "$HOME/.claude/hooks"
if [ ! -e "$HOME/.claude/hooks/dcg" ]; then
  ln -sfn "$setup_path/terminal/claude/hooks/dcg" "$HOME/.claude/hooks/dcg"
fi

auto_improve_hook="$HOME/.claude/hooks/auto-improve.py"
auto_improve_source="$setup_path/terminal/claude/hooks/auto-improve.py"
if [ -L "$auto_improve_hook" ] && [ "$(readlink "$auto_improve_hook")" = "$auto_improve_source" ]; then
  :
elif [ -e "$auto_improve_hook" ] || [ -L "$auto_improve_hook" ]; then
  echo "Cannot replace existing Claude auto-improve hook: $auto_improve_hook" >&2
  exit 73
else
  ln -s "$auto_improve_source" "$auto_improve_hook"
fi

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
