#! /usr/bin/env bash

if ! ${DOT_MAIN_SOURCED:-false} ; then
   source "$DOTFILES_PATH/terminal/core/args.sh"
   source "$DOTFILES_PATH/terminal/core/collections.sh"
   source "$DOTFILES_PATH/terminal/core/platform.sh"
   source "$DOTFILES_PATH/terminal/core/documentation.sh"
   source "$DOTFILES_PATH/terminal/core/log.sh"

   readonly DOT_MAIN_SOURCED=true
fi
