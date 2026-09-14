#!/bin/sh

set -eu

source_dir=$(CDPATH='' cd "$(dirname "$0")" && pwd)

if [ "$(uname -s)" != Darwin ] || [ -z "${HOME:-}" ] || [ ! -d "$HOME" ]; then
  printf 'Choosy restore requires macOS and an existing HOME directory.\n' >&2
  exit 69
fi

. "$source_dir/../../prelude.sh"

need plutil
need defaults
need pgrep
if pgrep -x Choosy >/dev/null; then
  printf 'Quit Choosy before restoring its settings.\n' >&2
  exit 69
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
for name in behaviours preferences; do
  file="$work/$name.plist"
  cp "$source_dir/$name.plist" "$file"
  plutil -lint "$file"
  case "$name" in
  behaviours)
    prefix=
    suffix=.behaviourArgument
    ;;
  preferences)
    prefix=browsers.
    suffix=
    ;;
  esac
  index=0
  while plutil -extract "$prefix$index" xml1 -o /dev/null "$file" 2>/dev/null; do
    plutil -replace "$prefix$index$suffix.supportPath" -string "$HOME/Library/Application Support/BraveSoftware/Brave-Browser" "$file"
    index=$((index + 1))
  done
done

destination="$HOME/Library/Application Support/Choosy"
mkdir -p "$SETUP_BACKUP_ROOT/choosy"
backup=$(mktemp -d "$SETUP_BACKUP_ROOT/choosy/restore.XXXXXX")
# Back up only settings, never the license or the whole Choosy directory.
if [ -e "$destination/behaviours.plist" ]; then
  cp "$destination/behaviours.plist" "$backup/behaviours.plist"
fi
if defaults read com.choosyosx.Choosy >/dev/null 2>&1; then
  defaults export com.choosyosx.Choosy "$backup/preferences.plist"
fi
mkdir -p "$destination"
cp "$work/behaviours.plist" "$destination/behaviours.plist"
defaults import com.choosyosx.Choosy "$work/preferences.plist"
printf 'Restored Choosy settings. Backup: %s\n' "$backup"
