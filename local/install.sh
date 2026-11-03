#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

if [ -f "$DOTFILES_PATH/local/gitconfig" ]; then
  link_path "$DOTFILES_PATH/local/gitconfig" "$HOME/.gitconfig.local"
fi

if [ -f "$DOTFILES_PATH/local/gitconfig.ahrefs" ]; then
  link_path "$DOTFILES_PATH/local/gitconfig.ahrefs" "$HOME/.gitconfig.ahrefs"
fi
