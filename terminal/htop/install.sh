#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

mkdir -p "$HOME/.config/htop"
link_path "$DOTFILES_PATH/terminal/htop/htoprc" "$HOME/.config/htop/htoprc"
