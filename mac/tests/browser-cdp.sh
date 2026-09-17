#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/repo/mac/raycast" "$work/repo/agents" "$work/bin" "$work/home"
launcher="$work/repo/mac/raycast/raycast-open-chrome-agent.sh"
cp "$root/mac/raycast/raycast-open-chrome-agent.sh" "$launcher"
config="$work/repo/agents/mcp.json"

cat >"$work/bin/curl" <<'EOF'
#!/bin/bash
count=0
if [[ -f "$TEST_WORK/count" ]]; then read -r count <"$TEST_WORK/count"; fi
count=$((count + 1))
printf '%s\n' "$count" >"$TEST_WORK/count"
printf '%s\n' "$*" >>"$TEST_WORK/curl.log"
[[ "$count" -ge "${READY_AFTER:-2}" ]]
EOF
cat >"$work/bin/open" <<'EOF'
#!/bin/bash
printf '%s\n' "$@" >>"$TEST_WORK/open.log"
exit "${OPEN_STATUS:-0}"
EOF
cat >"$work/bin/sleep" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >>"$TEST_WORK/sleep.log"
EOF
chmod +x "$work/bin/"*
for tool in bash mkdir; do ln -s "/bin/$tool" "$work/bin/$tool"; done
for tool in dirname readlink; do ln -s "/usr/bin/$tool" "$work/bin/$tool"; done

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}
contains() { grep -F -- "$2" "$1" >/dev/null || fail "$1 must contain $2; got: $(<"$1")"; }
fixture() {
  printf '{"servers":{"chrome-devtools":{"type":"local","command":%s}},"hosts":%s}\n' "$1" "${2-'{}'}" >"$config"
  rm -rf "$work/home/.chrome-agent-profile" "$work/custom profile"
  rm -f "$work/"*.log "$work/count"
}
run() {
  status=0
  env -i HOME="$work/home" PATH="$work/bin" TEST_WORK="$work" \
    DOTFILES_PATH=/wrong/checkout "$@" /bin/bash "$launcher" >"$work/stdout" 2>"$work/stderr" || status=$?
}
no_effects() {
  [[ ! -e "$work/curl.log" && ! -e "$work/open.log" && ! -e "$work/home/.chrome-agent-profile" ]] || fail 'rejection had side effects'
}
reject() {
  run
  [[ "$status" -ne 0 ]] || fail 'invalid declaration was accepted'
  contains "$work/stderr" 'agents/mcp.json'
  no_effects
}

env -i PATH="$work/bin" /bin/bash -c '! command -v node && ! command -v jq' || fail 'launcher PATH contains node or jq'

fixture '["npx","--no-usage-statistics","--browser-url=http://127.0.0.1:9333","chrome-devtools-mcp"]'
run READY_AFTER=1
[[ "$status" -eq 0 ]] || fail "existing listener: $(<"$work/stderr")"
contains "$work/curl.log" 'http://127.0.0.1:9333/json/version'
[[ ! -e "$work/open.log" && ! -e "$work/home/.chrome-agent-profile" ]] || fail 'existing listener launched browser'

fixture '["npx","chrome-devtools-mcp","--browser-url=http://127.0.0.1:9444"]'
run
[[ "$status" -eq 0 ]] || fail "startup: $(<"$work/stderr")"
expected=$(printf '%s\n' '-na' 'Brave Browser' '--args' '--remote-debugging-address=127.0.0.1' '--remote-debugging-port=9444' "--user-data-dir=$work/home/.chrome-agent-profile" 'about:blank')
[[ "$(<"$work/open.log")" == "$expected" ]] || fail 'wrong default open arguments'
[[ -d "$work/home/.chrome-agent-profile" ]] || fail 'default profile missing'
contains "$work/curl.log" '--max-time 1 http://127.0.0.1:9444/json/version'
run READY_AFTER=1
[[ "$status" -eq 0 && "$(<"$work/open.log")" == "$expected" ]] || fail 'rerun opened another browser'

fixture '["npx","--browser-url=http://127.0.0.1:80"]'
run CHROME_AGENT_PROFILE="$work/custom profile" CHROME_AGENT_APP='Custom Brave'
[[ "$status" -eq 0 ]] || fail 'custom profile/app startup'
contains "$work/open.log" 'Custom Brave'
contains "$work/open.log" "--user-data-dir=$work/custom profile"
contains "$work/open.log" '--remote-debugging-port=80'

ln -s repo "$work/folder-link"
ln -s folder-link/mac/raycast/raycast-open-chrome-agent.sh "$work/launcher-link"
original_launcher=$launcher
launcher="$work/launcher-link"
run READY_AFTER=1
[[ "$status" -eq 0 ]] || fail "symlink invocation: $(<"$work/stderr")"
launcher=$original_launcher

for port in 1 65535; do
  fixture "[\"npx\",\"--browser-url=http://127.0.0.1:$port\"]"
  run READY_AFTER=1
  [[ "$status" -eq 0 ]] || fail "valid port $port rejected"
  contains "$work/curl.log" "http://127.0.0.1:$port/json/version"
done

for url in 'http://127.0.0.1' 'https://127.0.0.1:9333' 'http://localhost:9333' \
  'http://0.0.0.0:9333' 'http://user@127.0.0.1:9333' 'http://127.0.0.1:9333/' \
  'http://127.0.0.1:9333?x=1' 'http://127.0.0.1:0' 'http://127.0.0.1:65536' \
  'http://127.0.0.1:-1' 'http://127.0.0.1:1.5' 'http://127.0.0.1:abc' \
  'http://127.0.0.1:09333' 'http://127.0.0.1:99999999999999999999' 'http://127.0.0.1:9333\n' ''; do
  fixture "[\"npx\",\"--browser-url=$url\"]"
  reject
done
for command in '["npx"]' '[]' 'null' '{}' '["npx",42]' \
  '["npx","--browser-url","http://127.0.0.1:9333"]' \
  '["npx","--browser-url=http://127.0.0.1:9333","--browser-url=http://127.0.0.1:9333"]'; do
  fixture "$command"
  reject
done
for content in '{}' '{"servers":{"chrome-devtools":{"type":"local"}}}' 'invalid json'; do
  fixture '[]'
  printf '%s\n' "$content" >"$config"
  reject
done
rm "$config"
reject

for profile in local ssh; do
  for patch in '{}' '{"enabled":false}' '{"environment":{"TEST":"value"}}' \
    '{"command":["other","--browser-url=http://127.0.0.1:9333"]}'; do
    fixture '["npx","--browser-url=http://127.0.0.1:9333"]' "{\"$profile\":{\"chrome-devtools\":$patch}}"
    run READY_AFTER=1
    [[ "$status" -eq 0 ]] || fail "inherited/equal $profile endpoint: $(<"$work/stderr")"
  done
  for patch in '{"command":["npx","--browser-url=http://127.0.0.1:9444"]}' \
    '{"enabled":false,"command":["npx","--browser-url=http://127.0.0.1:9444"]}' \
    '{"command":null}' '{"command":[]}' '{"type":"remote","url":"https://example.com"}'; do
    fixture '["npx","--browser-url=http://127.0.0.1:9333"]' "{\"$profile\":{\"chrome-devtools\":$patch}}"
    reject
  done
done

for override in '' 9333; do
  fixture '["npx","--browser-url=http://127.0.0.1:9333"]'
  run CHROME_AGENT_PORT="$override"
  [[ "$status" -ne 0 ]] || fail 'CHROME_AGENT_PORT accepted'
  contains "$work/stderr" 'CHROME_AGENT_PORT'
  contains "$work/stderr" 'agents/mcp.json'
  no_effects
done

fixture '["npx","--browser-url=http://127.0.0.1:9333"]'
run OPEN_STATUS=23
[[ "$status" -ne 0 ]] || fail 'open failure accepted'
contains "$work/stderr" 'Could not open'
run READY_AFTER=3
[[ "$status" -eq 0 ]] || fail 'retry after open failure'

fixture '["npx","--browser-url=http://127.0.0.1:9333"]'
run READY_AFTER=99
[[ "$status" -ne 0 ]] || fail 'timeout accepted'
[[ "$(<"$work/count")" == 21 ]] || fail 'wrong timeout probe count'
contains "$work/stderr" 'did not become available on 127.0.0.1:9333'
run READY_AFTER=23
[[ "$status" -eq 0 ]] || fail 'retry after timeout'
printf 'Browser CDP checks passed (native plutil; stubbed curl/open/sleep; no node/jq).\n'
