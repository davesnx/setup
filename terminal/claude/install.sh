#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

need bun
need npm

link_path "$DOTFILES_PATH/terminal/claude/settings.json" "$HOME/.claude/settings.json"
link_path "$DOTFILES_PATH/terminal/claude/statusline.ts" "$HOME/.claude/statusline.ts"
bun "$DOTFILES_PATH/terminal/claude/mcp.ts"
link_path "$DOTFILES_PATH/terminal/claude/.mcp.json" "$HOME/.mcp.json"

if [ -f "$DOTFILES_PATH/terminal/claude/settings.local.json" ]; then
  link_path "$DOTFILES_PATH/terminal/claude/settings.local.json" "$HOME/.claude/settings.local.json"
fi

link_path "$DOTFILES_PATH/agents/AGENTS.md" "$HOME/.claude/CLAUDE.md"
link_path "$DOTFILES_PATH/agents/skills" "$HOME/.claude/skills"
link_path "$DOTFILES_PATH/terminal/opencode/vendor/i-have-adhd/skills/i-have-adhd" "$HOME/.claude/skills/i-have-adhd"

# Puppet installs the real dcg wrapper at this path on nspawn; link the no-op
# stand-in only where nothing is there yet.
mkdir -p "$HOME/.claude/hooks"
if [ ! -e "$HOME/.claude/hooks/dcg" ]; then
  ln -sfn "$DOTFILES_PATH/terminal/claude/hooks/dcg" "$HOME/.claude/hooks/dcg"
fi

auto_improve_hook="$HOME/.claude/hooks/auto-improve.ts"
auto_improve_source="$DOTFILES_PATH/terminal/claude/hooks/auto-improve.ts"
if [ -L "$auto_improve_hook" ] && [ "$(readlink "$auto_improve_hook")" = "$auto_improve_source" ]; then
  :
elif [ -e "$auto_improve_hook" ] || [ -L "$auto_improve_hook" ]; then
  echo "Cannot replace existing Claude auto-improve hook: $auto_improve_hook" >&2
  exit 73
fi

npm ci --prefix "$DOTFILES_PATH/terminal/claude/hooks" --omit=dev --no-audit --no-fund

if [ ! -L "$auto_improve_hook" ]; then
  ln -s "$auto_improve_source" "$auto_improve_hook"
fi

old_auto_improve_hook="$HOME/.claude/hooks/auto-improve.py"
if [ -L "$old_auto_improve_hook" ] && [ "$(readlink "$old_auto_improve_hook")" = "$DOTFILES_PATH/terminal/claude/hooks/auto-improve.py" ]; then
  rm "$old_auto_improve_hook"
fi
