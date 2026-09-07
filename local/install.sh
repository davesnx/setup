#!/bin/sh

set -eu

setup_path=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
. "$setup_path/link.sh"

if [ -f "$setup_path/local/gitconfig" ]; then
  link_path "$setup_path/local/gitconfig" "$HOME/.gitconfig.local"
fi
