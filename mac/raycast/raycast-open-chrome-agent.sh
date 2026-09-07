#!/usr/bin/env bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open Brave Agent
# @raycast.mode compact

# Optional parameters:
# @raycast.packageName Browser
# @raycast.description Open Brave with localhost CDP enabled for agent control.

set -euo pipefail

PORT="${CHROME_AGENT_PORT:-9222}"
PROFILE_DIR="${CHROME_AGENT_PROFILE:-$HOME/.chrome-agent-profile}"
CHROME_APP="${CHROME_AGENT_APP:-Brave Browser}"
VERSION_URL="http://127.0.0.1:${PORT}/json/version"

if curl --silent --fail --max-time 2 "$VERSION_URL" >/dev/null; then
  echo "Chrome CDP is running on 127.0.0.1:${PORT}"
  exit 0
fi

mkdir -p "$PROFILE_DIR"

open -na "$CHROME_APP" --args \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE_DIR" \
  about:blank

for _ in {1..20}; do
  if curl --silent --fail --max-time 1 "$VERSION_URL" >/dev/null; then
    echo "Chrome CDP is running on 127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 0.5
done

echo "Chrome opened, but CDP did not become available on 127.0.0.1:${PORT}" >&2
exit 1
