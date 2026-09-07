#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
. "$setup_path/prelude.sh"

link_path "$setup_path/agents/AGENTS.md" "$HOME/.agents/AGENTS.md"
link_path "$setup_path/agents/skills" "$HOME/.agents/skills"
link_path "$setup_path/agents/skills/.skill-lock.json" "$HOME/.agents/.skill-lock.json"
