#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

link_path "$DOTFILES_PATH/agents/AGENTS.md" "$HOME/.agents/AGENTS.md"
link_skills "$HOME/.agents/skills"
link_skills "$HOME/.claude/skills"
link_path "$DOTFILES_PATH/agents/skills/.skill-lock.json" "$HOME/.agents/.skill-lock.json"
