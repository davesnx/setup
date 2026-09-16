#!/bin/sh

set -eu

root=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
zsh_bin=$(command -v zsh)
mkdir -p "$work/home" "$work/apple silicon/bin" "$work/intel/bin" "$work/path brew/bin"

for prefix in "$work/apple silicon" "$work/intel" "$work/path brew"; do
  mkdir -p "$prefix/sbin" "$prefix/share/zsh/site-functions"
  cat >"$prefix/bin/brew" <<'EOF'
#!/bin/sh
[ "$*" = 'shellenv sh' ] || exit 2
[ "${FAIL_BREW:-0}" = 0 ] || { printf 'export PARTIAL_BREW=1\n'; exit 42; }
prefix=${0%/bin/brew}
printf 'export HOMEBREW_PREFIX="%s"\n' "$prefix"
printf 'export PATH="%s/bin:%s/sbin:$PATH"\n' "$prefix" "$prefix"
EOF
  chmod +x "$prefix/bin/brew"
done

cat >"$work/check.zsh" <<'EOF'
fail() { print -u2 -- "FAIL: $*"; exit 1; }
# Block the old absolute calls before the fix, and any host completion repair.
function /opt/homebrew/bin/brew /usr/local/bin/brew ln() {
  fail "unexpected host command"
}
OSTYPE=darwin
export PKG_CONFIG_PATH=/existing/pkg
export LIBRARY_PATH=/existing/lib
export C_INCLUDE_PATH=/existing/include

load() {
  if [[ "$MODE" == profile ]]; then
    source "$DOTFILES_PATH/terminal/zsh/.zprofile"
  else
    source "$DOTFILES_PATH/mac/main.sh"
  fi
  return 0
}
check() {
  [[ "$HOMEBREW_PREFIX" == "$EXPECTED_PREFIX" ]] || fail "Brew prefix expected $EXPECTED_PREFIX, got ${HOMEBREW_PREFIX-unset}"
  [[ "$(command -v brew)" == "$EXPECTED_PREFIX/bin/brew" ]] || fail "selected Brew was lost from PATH"
  [[ ":$PATH:" == *":$EXPECTED_PREFIX/sbin:"* ]] || fail "sbin was lost from PATH"
  [[ "$LDFLAGS" == "-L$EXPECTED_PREFIX/opt/openssl@3/lib" ]] || fail "LDFLAGS uses the wrong prefix"
  [[ "$CPPFLAGS" == "-I$EXPECTED_PREFIX/opt/openssl@3/include" ]] || fail "CPPFLAGS uses the wrong prefix"
  [[ "$PKG_CONFIG_PATH" == "$EXPECTED_PREFIX/lib/pkgconfig:$EXPECTED_PREFIX/opt/openssl@3/lib/pkgconfig:/existing/pkg" ]] || fail "PKG_CONFIG_PATH uses the wrong prefix or duplicates entries"
  [[ "$LIBRARY_PATH" == "$EXPECTED_PREFIX/opt/libev/lib:$EXPECTED_PREFIX/lib:/existing/lib" ]] || fail "LIBRARY_PATH uses the wrong prefix or duplicates entries"
  [[ "$C_INCLUDE_PATH" == "$EXPECTED_PREFIX/include:/existing/include" ]] || fail "C_INCLUDE_PATH uses the wrong prefix or duplicates entries"
  completion_modules=()
  zmodule() { completion_modules+=("$1"); }
  source "$DOTFILES_PATH/terminal/zsh/.zimrc"
  [[ "${completion_modules[(Ie)$EXPECTED_PREFIX/share/zsh/site-functions]}" -gt 0 ]] || fail "Zim did not load Brew completions"
}

load
check
before="$PATH|$LDFLAGS|$CPPFLAGS|$PKG_CONFIG_PATH|$LIBRARY_PATH|$C_INCLUDE_PATH"
load
check
[[ "$before" == "$PATH|$LDFLAGS|$CPPFLAGS|$PKG_CONFIG_PATH|$LIBRARY_PATH|$C_INCLUDE_PATH" ]] || fail "repeated startup changed environment"
print -- "PASS: $MODE startup uses $EXPECTED_PREFIX and is repeatable"
EOF

for mode in main profile; do
  for selection in apple intel path; do
    case "$selection" in
      apple) search="$work/apple silicon/bin:$work/intel/bin"; expected="$work/apple silicon" ;;
      intel) search="$work/missing:$work/intel/bin"; expected="$work/intel" ;;
      path) search="$work/missing"; expected="$work/path brew" ;;
    esac
    env -i HOME="$work/home" DOTFILES_PATH="$root" MODE="$mode" \
      PATH="$work/path brew/bin:/usr/bin:/bin" BREW_SEARCH_PATHS="$search" \
      EXPECTED_PREFIX="$expected" "$zsh_bin" -df "$work/check.zsh"
  done
done

if ! env -i HOME="$work/home" DOTFILES_PATH="$root" PATH=/usr/bin:/bin \
  BREW_SEARCH_PATHS="$work/missing" "$zsh_bin" -dfs <<'EOF'
source "$DOTFILES_PATH/mac/main.sh"
source "$DOTFILES_PATH/mac/main.sh"
[[ -z "${HOMEBREW_PREFIX-}${LDFLAGS-}${CPPFLAGS-}${PKG_CONFIG_PATH-}${LIBRARY_PATH-}${C_INCLUDE_PATH-}" ]] || exit 1
zmodule() { [[ "$1" != /* ]] || exit 1; }
source "$DOTFILES_PATH/terminal/zsh/.zimrc"
EOF
then
  printf 'FAIL: absent Brew added build paths\n' >&2
  exit 1
fi
printf 'PASS: absent Brew adds no build paths\n'

if ! env -i HOME="$work/home" DOTFILES_PATH="$root" PATH=/usr/bin:/bin \
  BREW_SEARCH_PATHS="$work/intel/bin" FAIL_BREW=1 "$zsh_bin" -dfs <<'EOF'
source "$DOTFILES_PATH/mac/main.sh"
[[ -z "${PARTIAL_BREW-}${HOMEBREW_PREFIX-}${LDFLAGS-}" ]] || exit 1
unset FAIL_BREW
source "$DOTFILES_PATH/mac/main.sh"
[[ "$HOMEBREW_PREFIX" == "${BREW_SEARCH_PATHS%/bin}" ]] || exit 1
source "$DOTFILES_PATH/mac/main.sh"
[[ "$PKG_CONFIG_PATH" == "$HOMEBREW_PREFIX/lib/pkgconfig:$HOMEBREW_PREFIX/opt/openssl@3/lib/pkgconfig" ]] || exit 1
[[ "$LIBRARY_PATH" == "$HOMEBREW_PREFIX/opt/libev/lib:$HOMEBREW_PREFIX/lib" ]] || exit 1
[[ "$C_INCLUDE_PATH" == "$HOMEBREW_PREFIX/include" ]] || exit 1
EOF
then
  printf 'FAIL: Brew shellenv failure did not recover cleanly\n' >&2
  exit 1
fi
printf 'PASS: failed Brew shellenv is not evaluated and retry succeeds\n'
