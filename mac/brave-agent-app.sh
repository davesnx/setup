#!/usr/bin/env bash

set -euo pipefail

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

canonical_path() {
  local rest=$1 part resolved
  if [[ "$rest" != /* ]]; then
    rest="$PWD/$rest"
  fi
  resolved=/
  while [[ -n "$rest" ]]; do
    rest=${rest#/}
    [[ -n "$rest" ]] || break
    part=${rest%%/*}
    if [[ "$rest" == */* ]]; then
      rest=${rest#*/}
    else
      rest=
    fi
    case "$part" in
      '' | .) ;;
      ..)
        resolved=${resolved%/*}
        resolved=${resolved:-/}
        ;;
      *)
        if [[ -L "$resolved/$part" && ! -d "$resolved/$part" ]]; then
          die "Cannot resolve path: $resolved/$part"
        fi
        if [[ -d "$resolved/$part" ]]; then
          resolved=$(CDPATH='' cd -P -- "$resolved/$part" && pwd -P)
          while [[ "$resolved" == //* ]]; do
            resolved=${resolved#/}
          done
        else
          resolved="${resolved%/}/$part"
        fi
        ;;
    esac
  done
  printf '%s\n' "$resolved"
}

script_dir=$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_app=${1:-/Applications/Brave Browser.app}
target_app=${2:-$HOME/Applications/Brave Agent.app}
icon="$script_dir/brave-agent.icns"

[[ -d "$source_app" ]] || die "Brave not found at $source_app; install it first."
source_path=$(canonical_path "$source_app")
target_path=$(canonical_path "$target_app")
case "$target_path/" in
  "$source_path/"*) die "Target overlaps source: $target_app" ;;
esac
case "$source_path/" in
  "$target_path/"*) die "Target overlaps source: $target_app" ;;
esac
target_entry=$target_app
while [[ "$target_entry" == */ && "$target_entry" != / ]]; do
  target_entry=${target_entry%/}
done
[[ ! -L "$target_entry" ]] || die "Target is a symlink: $target_app"
[[ ! -e "$target_app" || -d "$target_app" ]] || die "Target is not an app directory: $target_app"
[[ -f "$source_app/Contents/Info.plist" ]] || die "Source app has no Info.plist: $source_app"
codesign --verify --deep --strict "$source_app"

mkdir -p "$(dirname "$target_app")"
stage_dir=$(mktemp -d "$(dirname "$target_app")/.brave-agent.XXXXXX")
stage_app="$stage_dir/app"
previous="$stage_dir/previous.app"
installed=0
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$installed" == 0 && -e "$previous" ]]; then
    if [[ -e "$target_app" ]]; then
      mv "$target_app" "$stage_dir/failed.app" || {
        printf 'Could not move failed replacement; old app remains at %s\n' "$previous" >&2
        exit "$status"
      }
    fi
    mv "$previous" "$target_app" || {
      printf 'Could not restore old app; it remains at %s\n' "$previous" >&2
      exit "$status"
    }
  fi
  rm -rf "$stage_dir" || exit 1
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cp -cR "$source_path" "$stage_app"
xattr -cr "$stage_app"

plist="$stage_app/Contents/Info.plist"
plutil -replace CFBundleIdentifier -string com.davesnx.brave-agent "$plist"
plutil -replace CFBundleName -string 'Brave Agent' "$plist"
plutil -replace CFBundleDisplayName -string 'Brave Agent' "$plist"
if plutil -type CFBundleIconName "$plist" >/dev/null 2>&1; then
  plutil -remove CFBundleIconName "$plist"
fi
cp "$icon" "$stage_app/Contents/Resources/app.icns"
codesign --remove-signature "$stage_app"
codesign --force --deep --sign - "$stage_app"
codesign --verify --deep --strict "$stage_app"
if [[ -e "$target_app" ]]; then
  mv "$target_app" "$previous"
fi
mv "$stage_app" "$target_app"
installed=1
