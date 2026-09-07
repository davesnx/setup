# shellcheck shell=sh
# Every install.sh sources this first, right after computing setup_path:
#
#   . "$setup_path/prelude.sh"
#
# It stops on errors and unset variables, picks one backup directory per
# install run (root install.sh exports it to every folder installer), and
# defines the helpers below.

set -eu

SETUP_BACKUP_ROOT=${SETUP_BACKUP_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/setup/backups/$(date +%Y%m%d%H%M%S)}
export SETUP_BACKUP_ROOT

# need COMMAND: stop with status 69 when COMMAND is not on PATH.
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '%s is required.\n' "$1" >&2
    exit 69
  fi
}

# link_path SOURCE TARGET: nothing happens when TARGET already links to SOURCE,
# so reruns are silent. Any other existing TARGET moves into the backup
# directory, keyed by its path under HOME, so two files with the same name
# cannot collide.
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

# link_path_guarded SOURCE TARGET: for a path another tool may own. A regular
# file or directory there stops the installer with status 73, an old link is
# replaced, and nothing is moved.
link_path_guarded() {
  if [ ! -e "$1" ]; then
    printf 'Missing setup source: %s\n' "$1" >&2
    exit 1
  fi
  if [ -e "$2" ] && [ ! -L "$2" ]; then
    printf 'Cannot replace %s: it is not a link\n' "$2" >&2
    exit 73
  fi
  mkdir -p "$(dirname "$2")"
  ln -sfn "$1" "$2"
}
