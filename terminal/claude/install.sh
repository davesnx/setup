#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/prelude.sh"

need bun
need npm

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

auto_improve_hook="$HOME/.claude/hooks/auto-improve.ts"
auto_improve_source="$setup_path/terminal/claude/hooks/auto-improve.ts"
if [ -L "$auto_improve_hook" ] && [ "$(readlink "$auto_improve_hook")" = "$auto_improve_source" ]; then
  :
elif [ -e "$auto_improve_hook" ] || [ -L "$auto_improve_hook" ]; then
  echo "Cannot replace existing Claude auto-improve hook: $auto_improve_hook" >&2
  exit 73
fi

npm ci --prefix "$setup_path/terminal/claude/hooks" --omit=dev --no-audit --no-fund

if [ ! -L "$auto_improve_hook" ]; then
  ln -s "$auto_improve_source" "$auto_improve_hook"
fi

old_auto_improve_hook="$HOME/.claude/hooks/auto-improve.py"
if [ -L "$old_auto_improve_hook" ] && [ "$(readlink "$old_auto_improve_hook")" = "$setup_path/terminal/claude/hooks/auto-improve.py" ]; then
  rm "$old_auto_improve_hook"
fi
