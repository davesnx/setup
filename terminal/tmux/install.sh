#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/prelude.sh"

link_path "$setup_path/terminal/tmux/.tmux.conf" "$HOME/.tmux.conf"

# The config loads this status line plugin at startup and errors without it.
if [ ! -d "$HOME/.tmux/plugins/tmux-nova" ]; then
  git clone --depth 1 https://github.com/o0th/tmux-nova.git "$HOME/.tmux/plugins/tmux-nova"
fi
