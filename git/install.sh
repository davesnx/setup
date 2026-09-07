#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
. "$setup_path/prelude.sh"

need diff-so-fancy

link_path "$setup_path/git/.gitconfig" "$HOME/.gitconfig"
link_path "$setup_path/git/.gitignore_global" "$HOME/.gitignore_global"
link_path "$setup_path/git/.gitattributes" "$HOME/.gitattributes"
