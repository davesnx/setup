#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

need diff-so-fancy

link_path "$DOTFILES_PATH/git/.gitconfig" "$HOME/.gitconfig"
link_path "$DOTFILES_PATH/git/.gitignore_global" "$HOME/.gitignore_global"
link_path "$DOTFILES_PATH/git/.gitattributes" "$HOME/.gitattributes"
