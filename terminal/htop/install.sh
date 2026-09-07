#!/bin/sh

set -eu

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/link.sh"

mkdir -p "$HOME/.config/htop"
link_path "$setup_path/terminal/htop/htoprc" "$HOME/.config/htop/htoprc"
