#!/bin/sh

set -eu

root=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

test_bin="$work/bin"
command_log="$work/commands.log"
brew_template="$work/brew"
apple_silicon_brew="$work/fallback/apple-silicon/brew"
mkdir -p "$test_bin"

export COMMAND_LOG="$command_log"
export TEST_BIN="$test_bin"
export BREW_TEMPLATE="$brew_template"
BREW_SEARCH_PATHS="$apple_silicon_brew $work/fallback/intel/brew"
export BREW_SEARCH_PATHS

cat >"$brew_template" <<'EOF'
#!/bin/sh
count=0
if [ -f "$TEST_BIN/brew-count" ]; then
  read -r count <"$TEST_BIN/brew-count"
fi
count=$((count + 1))
printf '%s\n' "$count" >"$TEST_BIN/brew-count"
printf 'brew:%s\n' "$*" >>"$COMMAND_LOG"
if [ "${FAIL_BREW_CALL:-0}" -eq "$count" ]; then
  exit 42
fi
EOF
chmod +x "$brew_template"

cat >"$test_bin/uname" <<'EOF'
#!/bin/sh
printf 'uname:%s\n' "$*" >>"$COMMAND_LOG"
printf '%s\n' "${FAKE_UNAME:-Darwin}"
EOF

cat >"$test_bin/curl" <<'EOF'
#!/bin/sh
output=
url=
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o)
      output=$2
      shift 2
      ;;
    -*) shift ;;
    *)
      url=$1
      shift
      ;;
  esac
done

printf 'curl:%s\n' "$url" >>"$COMMAND_LOG"
[ -n "$output" ] || exit 2

case "$url" in
  *Homebrew*)
    cat >"$output" <<'INSTALLER'
#!/bin/bash
if [[ ${INSTALL_BREW:-0} == 1 ]]; then
  cp "$BREW_TEMPLATE" "$TEST_BIN/brew"
  chmod +x "$TEST_BIN/brew"
fi
INSTALLER
    ;;
  *zimfw*)
    printf '%s\n' '# fixture zimfw' >"$output"
    if [ "${FAIL_ZIM_DOWNLOAD:-0}" -eq 1 ]; then
      exit 22
    fi
    ;;
  *) exit 22 ;;
esac
EOF

cat >"$test_bin/chsh" <<'EOF'
#!/bin/sh
printf 'chsh:%s\n' "$*" >>"$COMMAND_LOG"
if [ "${FAIL_CHSH:-0}" -eq 1 ]; then
  exit 44
fi
EOF

cat >"$test_bin/zsh" <<'EOF'
#!/bin/sh
printf 'zsh:%s\n' "$*" >>"$COMMAND_LOG"
EOF

cat >"$test_bin/ln" <<'EOF'
#!/bin/sh
printf 'ln:%s\n' "$*" >>"$COMMAND_LOG"
for argument in "$@"; do
  if [ -n "${FAIL_LN_TARGET:-}" ] && [ "$argument" = "$FAIL_LN_TARGET" ]; then
    exit 43
  fi
done
exec /bin/ln "$@"
EOF

cat >"$test_bin/launchctl" <<'EOF'
#!/bin/sh
printf 'launchctl:%s\n' "$*" >>"$COMMAND_LOG"
EOF

chmod +x "$test_bin/uname" "$test_bin/curl" "$test_bin/chsh" "$test_bin/zsh" "$test_bin/ln" "$test_bin/launchctl"
PATH="$test_bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH

prepare_home() {
  HOME="$work/home"
  export HOME
  rm -rf "$HOME"
  mkdir -p \
    "$HOME/Library/Application Support/Code/User" \
    "$HOME/Library/Application Support/Cursor/User" \
    "$HOME/.config/zed" \
    "$HOME/.config/ghostty"
  : >"$command_log"
  rm -rf "$work/fallback"
  rm -f "$test_bin/brew" "$test_bin/brew-count"
  unset FAIL_BREW_CALL INSTALL_BREW FAIL_ZIM_DOWNLOAD FAKE_UNAME FAIL_CHSH FAIL_LN_TARGET || true
}

install_brew_stub() {
  cp "$brew_template" "$test_bin/brew"
  chmod +x "$test_bin/brew"
}

expect_exit() {
  expected=$1
  shift
  set +e
  "$@" >"$work/stdout" 2>"$work/stderr"
  actual=$?
  set -e
  if [ "$actual" -ne "$expected" ]; then
    printf 'expected exit %s, got %s: %s\n' "$expected" "$actual" "$*" >&2
    return 1
  fi
}

prepare_home
expect_exit 64 /bin/sh "$root/mac/install.sh"
[ ! -s "$command_log" ]
printf 'PASS: missing setup path stops before commands\n'

prepare_home
expect_exit 66 /bin/sh "$root/mac/install.sh" "$work/missing"
[ ! -s "$command_log" ]
printf 'PASS: invalid setup path stops before commands\n'

prepare_home
FAKE_UNAME=Linux
export FAKE_UNAME
expect_exit 69 /bin/sh "$root/mac/install.sh" "$root"
[ ! -e "$HOME/.hushlogin" ]
printf 'PASS: unsupported host stops before mutation\n'

prepare_home
missing_home="$work/missing-home"
rm -rf "$missing_home"
expect_exit 69 /usr/bin/env HOME="$missing_home" /bin/sh "$root/mac/install.sh" "$root"
[ ! -e "$missing_home" ]
printf 'PASS: invalid HOME stops before mutation\n'

prepare_home
preflight_bin="$work/preflight-bin"
rm -rf "$preflight_bin"
mkdir -p "$preflight_bin"
cp "$test_bin/uname" "$preflight_bin/uname"
expect_exit 69 /usr/bin/env PATH="$preflight_bin" /bin/sh "$root/mac/install.sh" "$root"
[ ! -e "$HOME/.hushlogin" ]
printf 'PASS: missing curl stops before mutation\n'

prepare_home
install_brew_stub
FAIL_BREW_CALL=1
export FAIL_BREW_CALL
expect_exit 42 /bin/sh "$root/mac/install.sh" "$root"
[ ! -e "$HOME/.hushlogin" ]
printf 'PASS: failed bundle stops the Mac installer\n'

prepare_home
install_brew_stub
FAIL_BREW_CALL=1
export FAIL_BREW_CALL
expect_exit 42 /bin/sh "$root/install.sh"
[ ! -e "$HOME/.zshenv" ]
if grep -q '^chsh:' "$command_log"; then
  exit 1
fi
printf 'PASS: failed Mac phase stops the root installer\n'

prepare_home
INSTALL_BREW=1
export INSTALL_BREW
expect_exit 0 /bin/sh "$root/mac/install.sh" "$root"
[ "$(grep -c '^brew:bundle ' "$command_log")" -eq 2 ]
printf 'PASS: installer discovers newly installed Brew\n'

prepare_home
mkdir -p "$(dirname "$apple_silicon_brew")"
cp "$brew_template" "$apple_silicon_brew"
chmod +x "$apple_silicon_brew"
expect_exit 0 /bin/sh "$root/mac/install.sh" "$root"
[ "$(grep -c '^brew:bundle ' "$command_log")" -eq 2 ]
printf 'PASS: installer finds Apple Silicon Brew\n'

prepare_home
INSTALL_BREW=0
export INSTALL_BREW
expect_exit 69 /bin/sh "$root/mac/install.sh" "$root"
[ ! -e "$HOME/.hushlogin" ]
printf 'PASS: missing Brew stops after bootstrap\n'

prepare_home
install_brew_stub
FAIL_LN_TARGET="$HOME/.zshenv"
export FAIL_LN_TARGET
expect_exit 43 /bin/sh "$root/install.sh"
if grep -q '^chsh:' "$command_log"; then
  exit 1
fi
[ ! -e "$HOME/.zim" ]
printf 'PASS: failed root link stops later phases\n'

prepare_home
install_brew_stub
FAIL_CHSH=1
export FAIL_CHSH
expect_exit 44 /bin/sh "$root/install.sh"
[ ! -e "$HOME/.zim" ]
printf 'PASS: failed shell change stops Zim installation\n'

prepare_home
install_brew_stub
expect_exit 0 /bin/sh "$root/install.sh"
[ -L "$HOME/.zshenv" ]
grep -q '^chsh:' "$command_log"
grep -q '^zsh:' "$command_log"
printf 'PASS: successful Mac phase reaches root phases\n'

prepare_home
install_brew_stub
mkdir -p "$HOME/.zim"
printf 'original\n' >"$HOME/.zim/zimfw.zsh"
FAIL_ZIM_DOWNLOAD=1
export FAIL_ZIM_DOWNLOAD
expect_exit 22 /bin/sh "$root/install.sh"
grep -qx 'original' "$HOME/.zim/zimfw.zsh"
printf 'PASS: failed Zim download preserves the installed file\n'
