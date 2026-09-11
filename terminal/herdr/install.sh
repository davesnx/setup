#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/prelude.sh"

need herdr
need jq
HERDR_CONFIG_PATH="$setup_path/terminal/herdr/config.toml" herdr config check
link_path "$setup_path/terminal/herdr/config.toml" "$HOME/.config/herdr/config.toml"
