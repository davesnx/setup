#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/prelude.sh"

need zsh
zsh_path=$(command -v zsh)

link_path "$setup_path/terminal/zsh/.zshenv" "$HOME/.zshenv"
link_path "$setup_path/terminal/zsh/.zshrc" "$HOME/.zshrc"
link_path "$setup_path/terminal/zsh/.zprofile" "$HOME/.zprofile"
link_path "$setup_path/terminal/zsh/.zimrc" "$HOME/.zimrc"

# Change default terminal to ZSH
chsh -s "$zsh_path"

# Install zimfw without generating shell configuration.
mkdir -p "$HOME/.zim"
zimfw_download=$(mktemp "$HOME/.zim/zimfw.zsh.XXXXXX")
trap 'rm -f "$zimfw_download"' EXIT HUP INT TERM
curl -fsSL -o "$zimfw_download" https://github.com/zimfw/zimfw/releases/latest/download/zimfw.zsh
"$zsh_path" -n "$zimfw_download"
mv "$zimfw_download" "$HOME/.zim/zimfw.zsh"
trap - EXIT HUP INT TERM
"$zsh_path" -c "source \"\$ZIM_HOME/zimfw.zsh\" init -q"
