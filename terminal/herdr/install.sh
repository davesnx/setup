#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/prelude.sh"

link_path "$setup_path/terminal/herdr/config.toml" "$HOME/.config/herdr/config.toml"
