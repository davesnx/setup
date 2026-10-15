#!/bin/sh
# The installer links the hook, the hook blocks a commit when check.sh fails,
# and a rerun changes nothing. Uses a scratch checkout; the real one is untouched.

set -eu

root=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d "${TMPDIR:-/tmp}/setup-check.XXXXXX")
trap 'rm -rf "$work"' EXIT HUP INT TERM

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

repo="$work/repo"
mkdir -p "$repo" "$work/home" "$work/bin"
cp -R "$root/git" "$repo/git"
cp "$root/prelude.sh" "$repo/prelude.sh"
printf '#!/bin/sh\n' >"$work/bin/diff-so-fancy"
chmod +x "$work/bin/diff-so-fancy"

export HOME="$work/home" GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export DOTFILES_PATH="$repo" PATH="$work/bin:$PATH"
git -C "$repo" init -q
git -C "$repo" config user.name test
git -C "$repo" config user.email test@example.com

sh "$repo/git/install.sh" >/dev/null
hook="$repo/.git/hooks/pre-commit"
[ -L "$hook" ] && [ "$(readlink "$hook")" = "$repo/git/hooks/pre-commit" ] || fail "hook not linked"
[ -z "$(git -C "$repo" config --get core.hooksPath || true)" ] || fail "core.hooksPath was set"
sh "$repo/git/install.sh" >"$work/rerun.out"
[ ! -s "$work/rerun.out" ] || fail "rerun was not silent"
echo "PASS: installer links the hook once and leaves core.hooksPath unset"

printf 'exit 1\n' >"$repo/check.sh"
git -C "$repo" add check.sh
if git -C "$repo" commit -q -m blocked 2>/dev/null; then fail "failing check did not block the commit"; fi
echo "PASS: failing check blocks the commit"

cat >"$repo/check.sh" <<'EOF'
test "$1" = --shell-only
EOF
git -C "$repo" add check.sh
git -C "$repo" commit -q -m allowed || fail "passing check blocked the commit"
echo "PASS: passing check allows the commit, with --shell-only"
