#!/usr/bin/env bash

# Run from any directory with: bash /path/to/setup/shellcheck.sh
# Include extensionless commands and sourced .sh files; check Zsh syntax separately.
set -euo pipefail

root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
files=()
zsh_files=()
while IFS= read -r -d '' file; do
  [[ -f "$root/$file" ]] || continue
  IFS= read -r first_line <"$root/$file" || true
  case "$first_line" in
    '#!'*zsh*) zsh_files+=("$root/$file") ;;
    '#!'*bash* | '#!'*'/sh' | '#!'*' sh' | '# shellcheck shell='*) files+=("$root/$file") ;;
    '#!'*) ;;
    *)
      case "$file" in
        *.sh) files+=("$root/$file") ;;
        *.zsh) zsh_files+=("$root/$file") ;;
      esac
      ;;
  esac
done < <(git -C "$root" ls-files --cached --others --exclude-standard -z)

status=0
for file in "${files[@]}"; do
  IFS= read -r first_line <"$file" || true
  shell=bash
  case "$first_line" in
    '#!'*'/sh' | '#!'*' sh' | '# shellcheck shell=sh') shell='sh' ;;
  esac
  case "$file" in */prelude.sh) shell='sh' ;; esac
  shellcheck --norc --external-sources --source-path=SCRIPTDIR --source-path="$root" \
    --shell="$shell" --format=gcc "$file" || status=1
done
for file in "${zsh_files[@]}"; do
  zsh -n "$file" || status=1
done
printf 'Checked %s shell scripts and %s Zsh scripts.\n' "${#files[@]}" "${#zsh_files[@]}"
exit "$status"
