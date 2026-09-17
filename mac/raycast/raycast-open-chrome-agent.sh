#!/usr/bin/env bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open Brave Agent
# @raycast.mode compact

# Optional parameters:
# @raycast.packageName Browser
# @raycast.description Open Brave with localhost CDP enabled for agent control.

set -euo pipefail

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

if [[ ${CHROME_AGENT_PORT+x} ]]; then
  die 'CHROME_AGENT_PORT is no longer supported. Unset it and edit --browser-url in agents/mcp.json, then rerun both MCP renderers.'
fi

SCRIPT=${BASH_SOURCE[0]}
while [[ -L "$SCRIPT" ]]; do
  SCRIPT_DIR=$(CDPATH='' cd -P -- "$(dirname -- "$SCRIPT")" && pwd)
  SCRIPT=$(readlink "$SCRIPT")
  [[ "$SCRIPT" == /* ]] || SCRIPT="$SCRIPT_DIR/$SCRIPT"
done
SCRIPT_DIR=$(CDPATH='' cd -P -- "$(dirname -- "$SCRIPT")" && pwd)
DECLARATION=$(/usr/bin/plutil -convert json -o - "$SCRIPT_DIR/../../agents/mcp.json") || die 'Could not read agents/mcp.json'
SHARED=$(/usr/bin/plutil -extract servers.chrome-devtools json -o - - <<<"$DECLARATION") || die 'agents/mcp.json: missing servers.chrome-devtools'
TYPE=$(/usr/bin/plutil -extract type raw -expect string -o - - <<<"$SHARED") || die 'agents/mcp.json: chrome-devtools requires type local'
[[ "$TYPE" == local ]] || die 'agents/mcp.json: chrome-devtools requires a local server'

browser_url() {
  local snapshot=$1 count index argument url='' found=0
  count=$(/usr/bin/plutil -extract command raw -expect array -o - - <<<"$snapshot") || die 'agents/mcp.json: chrome-devtools.command must be an array'
  for ((index = 0; index < count; index++)); do
    # The suffix preserves trailing newlines so malformed arguments cannot become valid URLs.
    argument=$(/usr/bin/plutil -extract "command.$index" raw -expect string -n -o - - <<<"$snapshot" && printf '.') || die 'agents/mcp.json: chrome-devtools.command must contain strings'
    argument=${argument%.}
    case "$argument" in
      --browser-url | --browser-url=*)
        found=$((found + 1))
        url=${argument#--browser-url=}
        ;;
    esac
  done
  [[ "$found" == 1 ]] || die 'agents/mcp.json: expected exactly one --browser-url=http://127.0.0.1:<port> argument'
  [[ "$url" =~ ^http://127\.0\.0\.1:([1-9][0-9]{0,4})$ ]] || die 'agents/mcp.json: --browser-url must be http://127.0.0.1:<port>, port 1–65535 without leading zeros or a path'
  [[ "${BASH_REMATCH[1]}" -le 65535 ]] || die 'agents/mcp.json: --browser-url port must be 1–65535'
  printf '%s\n' "$url"
}

BROWSER_URL=$(browser_url "$SHARED") || exit 1
for profile in local ssh; do
  entry="hosts.$profile.chrome-devtools"
  if /usr/bin/plutil -type "$entry" -o - - <<<"$DECLARATION" >/dev/null 2>&1; then
    PATCH=$(/usr/bin/plutil -extract "$entry" json -expect dictionary -o - - <<<"$DECLARATION") || die "agents/mcp.json: $entry must be an object"
    if /usr/bin/plutil -type type -o - - <<<"$PATCH" >/dev/null 2>&1; then
      TYPE=$(/usr/bin/plutil -extract type raw -expect string -o - - <<<"$PATCH") || die "agents/mcp.json: $entry requires type local"
      [[ "$TYPE" == local ]] || die "agents/mcp.json: $entry requires a local server"
    fi
    if /usr/bin/plutil -type command -o - - <<<"$PATCH" >/dev/null 2>&1; then
      HOST_URL=$(browser_url "$PATCH") || exit 1
      [[ "$HOST_URL" == "$BROWSER_URL" ]] || die "agents/mcp.json: $entry browser endpoint must match servers.chrome-devtools on every profile"
    fi
  fi
done

ADDRESS=${BROWSER_URL#http://}
PORT=${ADDRESS##*:}
ADDRESS=${ADDRESS%:*}
PROFILE_DIR="${CHROME_AGENT_PROFILE:-$HOME/.chrome-agent-profile}"
CHROME_APP="${CHROME_AGENT_APP:-Brave Browser}"
VERSION_URL="$BROWSER_URL/json/version"

if curl --silent --fail --max-time 2 "$VERSION_URL" >/dev/null; then
  echo "Chrome CDP is running on ${ADDRESS}:${PORT}"
  exit 0
fi

mkdir -p "$PROFILE_DIR"

open -na "$CHROME_APP" --args \
  --remote-debugging-address="$ADDRESS" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE_DIR" \
  about:blank || die "Could not open $CHROME_APP for CDP at $BROWSER_URL"

for _ in {1..20}; do
  if curl --silent --fail --max-time 1 "$VERSION_URL" >/dev/null; then
    echo "Chrome CDP is running on ${ADDRESS}:${PORT}"
    exit 0
  fi
  sleep 0.5
done

echo "Chrome opened, but CDP did not become available on ${ADDRESS}:${PORT}" >&2
exit 1
