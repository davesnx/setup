#!/usr/bin/env bash
set -euo pipefail

roots=(/Applications "$HOME/Applications")
if [[ $# -gt 0 ]]; then
  roots=("$@")
fi

for root in "${roots[@]}"; do
  for executable in \
    'Chromium.app/Contents/MacOS/Chromium' \
    'Google Chrome.app/Contents/MacOS/Google Chrome' \
    'Brave Browser.app/Contents/MacOS/Brave Browser' \
    'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'; do
    if [[ -f "$root/$executable" && -x "$root/$executable" ]]; then
      printf '%s\n' "$root/$executable"
      exit 0
    fi
  done
done
exit 1
