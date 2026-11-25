#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

link_path "$DOTFILES_PATH/agents/AGENTS.md" "$HOME/.agents/AGENTS.md"
link_skills "$HOME/.agents/skills"
link_skills "$HOME/.claude/skills"

# Claude Desktop's synced skills are for Claude only. Pi scans ~/.agents/skills
# recursively, where they would collide with the shared skills.
synced=$DOTFILES_PATH/agents/skills/synced
if [ -L "$HOME/.agents/skills/synced" ]; then
  rm "$HOME/.agents/skills/synced"
fi
if [ -d "$synced" ]; then
  link_path "$synced" "$HOME/.claude/skills/synced"
fi
link_path "$DOTFILES_PATH/agents/skills/.skill-lock.json" "$HOME/.agents/.skill-lock.json"
