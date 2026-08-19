#!/usr/bin/env bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open Chrome Agent
# @raycast.mode compact

# Optional parameters:
# @raycast.packageName Browser
# @raycast.description Open Chrome with localhost CDP enabled for SSH agent control.

set -euo pipefail

PORT="${CHROME_AGENT_PORT:-9222}"
PROFILE_DIR="${CHROME_AGENT_PROFILE:-$HOME/.chrome-agent-profile}"
CHROME_APP="${CHROME_AGENT_APP:-Google Chrome}"
VERSION_URL="http://127.0.0.1:${PORT}/json/version"
APP_URL="${CHROME_AGENT_AHREFS_APP_URL:-http://localhost:8888}"
MONOREPO_DIR="${CHROME_AGENT_MONOREPO:-$HOME/Code/git.ahrefs.com/monorepo}"
AUTH_BASE_URL="${CHROME_AGENT_AHREFS_AUTH_BASE_URL:-http://auth.ahrefs.me:8443}"

find_node() {
  if [ -n "${CHROME_AGENT_NODE:-}" ] && [ -x "$CHROME_AGENT_NODE" ]; then
    printf '%s\n' "$CHROME_AGENT_NODE"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  for candidate in \
    "$HOME/.local/share/cursor-agent/versions/2026.01.23-916f423/node" \
    "$HOME/.local/share/cursor-agent/versions/2025.09.18-7ae6800/node" \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    /usr/bin/node; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

sync_ahrefs_cookie() {
  if [ "${CHROME_AGENT_SYNC_AHREFS_COOKIE:-1}" = "0" ]; then
    return 0
  fi

  if ! curl --silent --fail --max-time 2 --head "$APP_URL" >/dev/null; then
    return 0
  fi

  node_bin="$(find_node || true)"
  if [ -z "$node_bin" ]; then
    if [ -n "${CHROME_AGENT_DEBUG:-}" ]; then
      echo "Ahrefs cookie sync skipped: node not found" >&2
    fi
    return 0
  fi

  CHROME_AGENT_PORT="$PORT" \
    CHROME_AGENT_AHREFS_APP_URL="$APP_URL" \
    CHROME_AGENT_MONOREPO="$MONOREPO_DIR" \
    CHROME_AGENT_AHREFS_AUTH_BASE_URL="$AUTH_BASE_URL" \
    "$node_bin" <<'NODE'
const fs = require('node:fs');

const port = process.env.CHROME_AGENT_PORT || '9222';
const appUrl = process.env.CHROME_AGENT_AHREFS_APP_URL || 'http://localhost:8888';
const monorepo = process.env.CHROME_AGENT_MONOREPO;
const authBaseUrl = process.env.CHROME_AGENT_AHREFS_AUTH_BASE_URL || 'http://auth.ahrefs.me:8443';

function readQaCredentials() {
  const file = `${monorepo}/qa/ts-tests/Helpers/test-users.ts`;
  const source = fs.readFileSync(file, 'utf8');
  const primaryBlock = source.match(/primary:\s*{[\s\S]*?}/)?.[0] || '';
  const userId = Number(primaryBlock.match(/userId:\s*(\d+)/)?.[1]);
  const token = primaryBlock.match(/token:\s*'([^']+)'/)?.[1];

  if (!userId || !token) {
    throw new Error(`Could not read QA auth credentials from ${file}`);
  }

  return { userId, token };
}

function requestJson(url, options) {
  return fetch(url, { signal: AbortSignal.timeout(10_000), ...options }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}`);
    }
    return response.json();
  });
}

function parseSetCookie(header, cookieName) {
  const cookie = header
    .split(/,(?=\s*[^;,\s]+=)/)
    .find((entry) => entry.trim().startsWith(`${cookieName}=`));

  if (!cookie) {
    throw new Error(`${cookieName} was not returned by authSessionLogin`);
  }

  const parts = cookie.trim().split(/;\s*/);
  const [name, ...valueParts] = parts[0].split('=');
  const attrs = Object.fromEntries(parts.slice(1).map((part) => {
    const [key, ...value] = part.split('=');
    return [key.toLowerCase(), value.join('=') || true];
  }));

  return { name, value: valueParts.join('='), attrs };
}

async function cdpCall(ws, method, params = {}) {
  const id = ++cdpCall.id;
  ws.send(JSON.stringify({ id, method, params }));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      reject(new Error(`${method} timed out`));
    }, 10_000);

    function onMessage(event) {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;

      clearTimeout(timeout);
      ws.removeEventListener('message', onMessage);

      if (message.error) {
        reject(new Error(`${method} failed: ${message.error.message}`));
      } else {
        resolve(message.result);
      }
    }

    ws.addEventListener('message', onMessage);
  });
}
cdpCall.id = 0;

async function main() {
  const qaCredentials = readQaCredentials();
  const userId = Number(process.env.CHROME_AGENT_AHREFS_USER_ID) || qaCredentials.userId;
  const token = process.env.CHROME_AGENT_AHREFS_AUTH_TOKEN || qaCredentials.token;
  const authUrl = `${authBaseUrl}/api/0.1/admin/auth/session/${userId}`;
  const auth = await requestJson(authUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const sessionId = auth?.result?.session_id;

  if (!sessionId) {
    throw new Error('Auth response did not include result.session_id');
  }

  const loginUrl = new URL('/v4/authSessionLogin', appUrl).href;
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!loginResponse.ok) {
    throw new Error(`authSessionLogin returned HTTP ${loginResponse.status}`);
  }

  const cookie = parseSetCookie(loginResponse.headers.get('set-cookie') || '', 'BSSESSID');

  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: 'PUT',
    signal: AbortSignal.timeout(10_000),
  }).then((response) => response.json());

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP websocket open timed out')), 10_000);
    ws.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  try {
    const result = await cdpCall(ws, 'Network.setCookie', {
      name: cookie.name,
      value: cookie.value,
      url: appUrl,
      path: cookie.attrs.path || '/',
      secure: Boolean(cookie.attrs.secure),
      httpOnly: Boolean(cookie.attrs.httponly),
      sameSite: cookie.attrs.samesite || 'Lax',
      expires: cookie.attrs.expires ? Math.floor(new Date(cookie.attrs.expires).getTime() / 1000) : undefined,
    });

    if (!result.success) {
      throw new Error('Network.setCookie returned success=false');
    }
  } finally {
    ws.close();
    if (target.id) {
      await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
    }
  }
}

main().catch((error) => {
  if (process.env.CHROME_AGENT_DEBUG) {
    console.error(`Ahrefs cookie sync skipped: ${error.message}`);
  }
  process.exit(0);
});
NODE
}

cdp_was_running=0
if curl --silent --fail --max-time 2 "$VERSION_URL" >/dev/null; then
  cdp_was_running=1
fi

if [ "$cdp_was_running" = "0" ]; then
  mkdir -p "$PROFILE_DIR"

  open -na "$CHROME_APP" --args \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port="$PORT" \
    --user-data-dir="$PROFILE_DIR" \
    about:blank

  for _ in {1..20}; do
    if curl --silent --fail --max-time 1 "$VERSION_URL" >/dev/null; then
      echo "Chrome CDP is running on 127.0.0.1:${PORT}"
      sync_ahrefs_cookie
      exit 0
    fi
    sleep 0.5
  done

  echo "Chrome opened, but CDP did not become available on 127.0.0.1:${PORT}" >&2
  exit 1
fi

sync_ahrefs_cookie
