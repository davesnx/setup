#!/bin/sh

set -eu

setup_path=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)

ssh_config_dir="$HOME/.ssh/config.d"
ssh_nspawn_config="$ssh_config_dir/nspawn.conf"
mkdir -p "$ssh_config_dir"
chmod 700 "$HOME/.ssh" "$ssh_config_dir"

# This path may be owned by a third party, so refuse rather than replace it.
if [ -e "$ssh_nspawn_config" ] && [ ! -L "$ssh_nspawn_config" ]; then
  echo "Cannot replace SSH config file: $ssh_nspawn_config" >&2
  exit 73
fi
ln -sfn "$setup_path/ssh/nspawn.conf" "$ssh_nspawn_config"

# The same snippet was linked as xdg-open.conf before it grew the CDP forward.
old_link="$ssh_config_dir/xdg-open.conf"
if [ -L "$old_link" ] && [ "$(readlink "$old_link")" = "$setup_path/ssh/xdg-open.conf" ]; then
  rm "$old_link"
fi

ssh_config="$HOME/.ssh/config"
if [ ! -e "$ssh_config" ]; then
  (umask 077 && : >"$ssh_config")
fi
if ! grep -Eq '^[[:space:]]*Include[[:space:]]+(~/.ssh/)?config\.d/\*[[:space:]]*$' "$ssh_config"; then
  printf '\nInclude config.d/*\n' >>"$ssh_config"
fi
