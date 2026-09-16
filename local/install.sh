#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

if [ -f "$DOTFILES_PATH/local/gitconfig" ]; then
  link_path "$DOTFILES_PATH/local/gitconfig" "$HOME/.gitconfig.local"
fi
