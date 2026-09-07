# shellcheck shell=sh
# Shared by every install.sh. Source it, then call:
#
#   link_path SOURCE TARGET
#
# Nothing happens when TARGET already links to SOURCE, so reruns are silent.
# Any other existing TARGET moves into one backup directory per install run,
# keyed by its path under HOME, so two files with the same name cannot collide.

SETUP_BACKUP_ROOT=${SETUP_BACKUP_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/setup/backups/$(date +%Y%m%d%H%M%S)}
export SETUP_BACKUP_ROOT

link_path() {
  if [ ! -e "$1" ]; then
    printf 'Missing setup source: %s\n' "$1" >&2
    exit 1
  fi
  if [ -L "$2" ] && [ "$(readlink "$2")" = "$1" ]; then
    return
  fi
  if [ -e "$2" ] || [ -L "$2" ]; then
    backup="$SETUP_BACKUP_ROOT/${2#"$HOME"/}"
    mkdir -p "$(dirname "$backup")"
    mv "$2" "$backup"
    printf 'Moved %s to %s\n' "$2" "$backup"
  fi
  mkdir -p "$(dirname "$2")"
  ln -s "$1" "$2"
}
