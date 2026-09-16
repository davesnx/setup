#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

need herdr
need jq
HERDR_CONFIG_PATH="$DOTFILES_PATH/terminal/herdr/config.toml" herdr config check
link_path "$DOTFILES_PATH/terminal/herdr/config.toml" "$HOME/.config/herdr/config.toml"
