#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
script=${BRAVE_SCRIPT:-$root/mac/brave-agent-app.sh}
work=$(mktemp -d "${TMPDIR:-/tmp}/setup-check.XXXXXX")
trap 'rm -rf "$work"' EXIT

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

source_app="$work/Fixture Source.app"
mkdir -p "$source_app/Contents/MacOS" "$source_app/Contents/Resources"
cp /usr/bin/true "$source_app/Contents/MacOS/Fixture"
codesign --remove-signature "$source_app/Contents/MacOS/Fixture"
printf 'original icon\n' >"$source_app/Contents/Resources/app.icns"
cat >"$source_app/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>Fixture</string>
  <key>CFBundleIconName</key><string>AppIcon</string>
  <key>CFBundleIdentifier</key><string>com.example.fixture</string>
  <key>CFBundleName</key><string>Fixture</string>
  <key>CFBundlePackageType</key><string>APPL</string>
</dict>
</plist>
EOF
xattr -cr "$source_app"
codesign --force --sign - "$source_app"
cp "$source_app/Contents/Info.plist" "$work/source-plist.before"

target_app="$work/home/Applications/Brave Agent.app"
run() {
  /bin/bash "$script" "$source_app" "$target_app"
}

run >"$work/stdout" 2>"$work/stderr" || fail "build failed: $(<"$work/stderr")"
[[ ! -s "$work/stdout" && ! -s "$work/stderr" ]] || fail "build printed output: $(<"$work/stdout") $(<"$work/stderr")"

plist="$target_app/Contents/Info.plist"
for key in CFBundleIdentifier:com.davesnx.brave-agent CFBundleName:'Brave Agent' CFBundleDisplayName:'Brave Agent' CFBundleExecutable:Fixture; do
  name=${key%%:*}
  expected=${key#*:}
  actual=$(plutil -extract "$name" raw -o - "$plist")
  [[ "$actual" == "$expected" ]] || fail "$name is '$actual', want '$expected'"
done

if plutil -type CFBundleIconName "$plist" >/dev/null 2>&1; then
  fail 'CFBundleIconName would keep the stock asset catalog icon'
fi
cmp -s "$root/mac/brave-agent.icns" "$target_app/Contents/Resources/app.icns" || fail 'app icon was not replaced'
codesign --verify --deep --strict "$target_app" || fail 'copy is not validly signed'
signature=$(codesign -dv "$target_app" 2>&1)
grep -qx 'Identifier=com.davesnx.brave-agent' <<<"$signature" || fail 'signed identifier does not match bundle id'

cmp -s "$work/source-plist.before" "$source_app/Contents/Info.plist" || fail 'source app plist was modified'
[[ "$(plutil -extract CFBundleIdentifier raw -o - "$source_app/Contents/Info.plist")" == com.example.fixture ]] || fail 'source bundle id changed'
[[ "$(<"$source_app/Contents/Resources/app.icns")" == 'original icon' ]] || fail 'source icon was modified'

run >"$work/stdout" 2>"$work/stderr" || fail "rebuild over existing copy failed: $(<"$work/stderr")"
rebuilt_id=$(plutil -extract CFBundleIdentifier raw -o - "$plist")
[[ "$rebuilt_id" == com.davesnx.brave-agent ]] || fail 'rebuild lost the bundle id'

missing="$work/missing.app"
status=0
/bin/bash "$script" "$missing" "$work/never/Brave Agent.app" >"$work/stdout" 2>"$work/stderr" || status=$?
[[ "$status" -ne 0 ]] || fail 'missing source accepted'
grep -qF "Brave not found at $missing" "$work/stderr" || fail "missing source message: $(<"$work/stderr")"
[[ ! -e "$work/never" ]] || fail 'missing source created a target'

mkdir -p "$work/aliases"
ln -s "$source_app" "$work/aliases/source.app"
ln -s "$target_app" "$work/aliases/target.app"
for unsafe in "$source_app" "$work/aliases/source.app" "$source_app/Contents/Nested.app" "$work/aliases/source.app/Contents/Nested.app" "$work/aliases/../Fixture Source.app"; do
  status=0
  /bin/bash "$script" "$source_app" "$unsafe" >"$work/stdout" 2>"$work/stderr" || status=$?
  [[ "$status" -ne 0 ]] || fail "unsafe target accepted: $unsafe"
  [[ -f "$source_app/Contents/Info.plist" ]] || fail "unsafe target removed source: $unsafe"
done
status=0
/bin/bash "$script" "$target_app" "$work/home/Applications" >"$work/stdout" 2>"$work/stderr" || status=$?
[[ "$status" -ne 0 && -d "$target_app" ]] || fail 'ancestor target accepted'
status=0
/bin/bash "$script" "$work/aliases/source.app" "$source_app" >"$work/stdout" 2>"$work/stderr" || status=$?
[[ "$status" -ne 0 && -d "$source_app" ]] || fail "source alias target accepted (status $status): $(<"$work/stderr")"
for unsafe in "$work/aliases/target.app" "$work/aliases/target.app/"; do
  status=0
  /bin/bash "$script" "$source_app" "$unsafe" >"$work/stdout" 2>"$work/stderr" || status=$?
  [[ "$status" -ne 0 && -d "$target_app" ]] || fail "target symlink accepted: $unsafe"
done
alias_target="$work/home/Applications/Agent from alias.app"
/bin/bash "$script" "$work/aliases/source.app" "$alias_target" >"$work/stdout" 2>"$work/stderr" || fail "source alias build failed: $(<"$work/stderr")"
codesign --verify --deep --strict "$alias_target" || fail 'source alias build is not signed'
cmp -s "$work/source-plist.before" "$source_app/Contents/Info.plist" || fail 'source alias build modified source'

mkdir -p "$work/bin"
cat >"$work/bin/cp" <<'EOF'
#!/bin/bash
if [[ "${INJECT_FAIL:-}" == copy && "$1" == -cR ]]; then
  echo 'injected copy failure' >&2
  exit 42
fi
exec /bin/cp "$@"
EOF
cat >"$work/bin/codesign" <<'EOF'
#!/bin/bash
case "${INJECT_FAIL:-}:$1" in
  sign:--force)
    echo "injected ${INJECT_FAIL} failure" >&2
    exit 43
    ;;
esac
if [[ "${INJECT_FAIL:-}" == verify && "$1" == --verify && "$*" == *"/.brave-agent."* ]]; then
  echo 'injected verify failure' >&2
  exit 43
fi
exec /usr/bin/codesign "$@"
EOF
cat >"$work/bin/mv" <<'EOF'
#!/bin/bash
if [[ "${INJECT_FAIL:-}" == backup && "$1" == *"/Brave Agent.app" && "$2" == *"/.brave-agent."* ]]; then
  echo 'injected backup failure' >&2
  exit 45
fi
if [[ "${INJECT_FAIL:-}" == replacement && "$1" == *"/.brave-agent."* && "$1" == *"/app" ]]; then
  echo 'injected replacement failure' >&2
  exit 44
fi
exec /bin/mv "$@"
EOF
chmod +x "$work/bin/cp" "$work/bin/codesign" "$work/bin/mv"
export PATH="$work/bin:$PATH"

printf 'previous build\n' >"$target_app/Contents/Resources/previous-build-marker"
codesign --force --deep --sign - "$target_app" >"$work/sign-output" 2>&1 || fail 'could not sign previous target'
for failure in copy sign verify backup replacement; do
  status=0
  INJECT_FAIL="$failure" run >"$work/stdout" 2>"$work/stderr" || status=$?
  case "$failure" in
    copy) expected_status=42 ;;
    sign | verify) expected_status=43 ;;
    backup) expected_status=45 ;;
    replacement) expected_status=44 ;;
  esac
  [[ "$status" -eq "$expected_status" ]] || fail "$failure returned $status, want $expected_status: $(<"$work/stderr")"
  grep -q "injected $failure failure" "$work/stderr" || fail "$failure error was lost"
  [[ "$(<"$target_app/Contents/Resources/previous-build-marker")" == 'previous build' ]] || fail "$failure failure lost old target"
  codesign --verify --deep --strict "$target_app" || fail "$failure failure damaged old target"
  [[ -z "$(find "$work/home/Applications" -maxdepth 1 -name '.brave-agent.*' -print)" ]] || fail "$failure failure left staging files"
done

run >"$work/stdout" 2>"$work/stderr" || fail "rebuild after failures failed: $(<"$work/stderr")"
[[ ! -e "$target_app/Contents/Resources/previous-build-marker" ]] || fail 'successful rebuild retained old target contents'

cp -R "$source_app" "$work/invalid source.app"
printf 'tamper\n' >>"$work/invalid source.app/Contents/Info.plist"
status=0
/bin/bash "$script" "$work/invalid source.app" "$target_app" >"$work/stdout" 2>"$work/stderr" || status=$?
[[ "$status" -ne 0 ]] || fail 'invalid source accepted'
codesign --verify --deep --strict "$target_app" || fail 'invalid source damaged target'
[[ -z "$(find "$work/home/Applications" -maxdepth 1 -name '.brave-agent.*' -print)" ]] || fail 'invalid source left staging files'

printf 'Brave Agent app checks passed.\n'
