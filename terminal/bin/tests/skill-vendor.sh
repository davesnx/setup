#!/bin/bash

set -euo pipefail

bin=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
trap 'exit 130' INT
trap 'exit 143' HUP TERM
vendor="$bin/skill-vendor"

export GIT_CONFIG_GLOBAL="$work/gitconfig" GIT_CONFIG_NOSYSTEM=1
git config --file "$GIT_CONFIG_GLOBAL" user.name test
git config --file "$GIT_CONFIG_GLOBAL" user.email test@example.com
git config --file "$GIT_CONFIG_GLOBAL" commit.gpgsign false
git config --file "$GIT_CONFIG_GLOBAL" init.defaultBranch main

# Upstream one keeps skills under skills/; upstream two keeps them at the root.
git init -q --bare "$work/upstream.git"
git clone -q "$work/upstream.git" "$work/seed" 2>/dev/null
mkdir -p "$work/seed/skills/alpha" "$work/seed/skills/beta"
printf 'a1\n' >"$work/seed/skills/alpha/SKILL.md"
printf 'b1\n' >"$work/seed/skills/beta/SKILL.md"
git -C "$work/seed" add -A
git -C "$work/seed" commit -q -m seed
git -C "$work/seed" push -q origin HEAD:main
pin=$(git -C "$work/seed" rev-parse HEAD)

git init -q --bare "$work/root.git"
git clone -q "$work/root.git" "$work/root-seed" 2>/dev/null
mkdir -p "$work/root-seed/delta"
printf 'd1\n' >"$work/root-seed/delta/SKILL.md"
git -C "$work/root-seed" add -A
git -C "$work/root-seed" commit -q -m seed
git -C "$work/root-seed" push -q origin HEAD:main

mkdir -p "$work/skills"
cp -R "$work/seed/skills/alpha" "$work/seed/skills/beta" "$work/root-seed/delta" "$work/skills/"
printf '# repository branch dir commit skills\n%s main skills %s alpha beta gamma\n%s main . - delta\n' \
  "$work/upstream.git" "$pin" "$work/root.git" >"$work/skills/VENDOR"
export SKILL_VENDOR_MANIFEST="$work/skills/VENDOR" SKILL_VENDOR_CACHE="$work/cache"

pass=0
fail=0
ok() {
  printf 'ok %s\n' "$1"
  pass=$((pass + 1))
}
bad() {
  printf 'FAIL %s\n' "$1"
  fail=$((fail + 1))
}

# expect_check NAME EXIT PATTERN...: run check, verify exit code and output lines.
expect_check() {
  local name=$1 expected=$2 out rc=0 pattern
  shift 2
  out=$("$vendor" check 2>&1) || rc=$?
  if [ "$rc" -ne "$expected" ]; then
    bad "$name: exit $rc, expected $expected"
    printf '%s\n' "$out"
    return
  fi
  for pattern in "$@"; do
    if ! grep -Eq -- "$pattern" <<<"$out"; then
      bad "$name: missing '$pattern'"
      printf '%s\n' "$out"
      return
    fi
  done
  ok "$name"
}

upstream_edit() {
  printf '%s\n' "$2" >"$work/seed/skills/$1/SKILL.md"
  git -C "$work/seed" commit -q -am "edit $1"
  git -C "$work/seed" push -q origin HEAD:main
}

upstream_head() {
  git -C "$work/seed" rev-parse HEAD
}

pin_of() {
  grep -v '^#' "$work/skills/VENDOR" | grep "$1" | awk '{print $4}'
}

expect_check fresh 0 'alpha +up to date' 'beta +up to date' 'gamma +pending' 'delta +up to date'

upstream_edit alpha a2
expect_check 'upstream ahead' 1 'alpha +upstream ahead' 'beta +up to date'
"$vendor" pull >/dev/null 2>&1
if grep -qx a2 "$work/skills/alpha/SKILL.md" && [ "$(pin_of upstream.git)" = "$(upstream_head)" ] &&
  [ "$(pin_of root.git)" = "$(git -C "$work/root-seed" rev-parse HEAD)" ]; then
  ok 'pull updates the copy and records both pins'
else
  bad 'pull updates the copy and records both pins'
fi
expect_check 'after pull' 0 'alpha +up to date' 'delta +up to date'

printf 'b2\n' >"$work/skills/beta/SKILL.md"
mkdir "$work/skills/gamma"
printf 'g1\n' >"$work/skills/gamma/SKILL.md"
expect_check 'local ahead' 1 'beta +local ahead' 'gamma +new local'
if "$vendor" pull >/dev/null 2>&1; then
  bad 'pull refuses local changes'
else
  ok 'pull refuses local changes'
fi
"$vendor" push -m 'Update beta and gamma' >/dev/null 2>&1
git -C "$work/seed" fetch -q origin main
git -C "$work/seed" reset -q --hard origin/main
if grep -qx b2 "$work/seed/skills/beta/SKILL.md" && grep -qx g1 "$work/seed/skills/gamma/SKILL.md" &&
  [ "$(git -C "$work/seed" log -1 --format=%s)" = 'Update beta and gamma' ] &&
  [ "$(pin_of upstream.git)" = "$(upstream_head)" ]; then
  ok 'push publishes into the upstream directory and records the pin'
else
  bad 'push publishes into the upstream directory and records the pin'
fi
expect_check 'after push' 0 'beta +up to date' 'gamma +up to date'

upstream_edit alpha a3
printf 'a-local\n' >"$work/skills/alpha/SKILL.md"
expect_check diverged 1 'alpha +diverged'
if "$vendor" pull >/dev/null 2>&1; then
  bad 'pull refuses diverged'
else
  ok 'pull refuses diverged'
fi
if "$vendor" push -m x >/dev/null 2>&1; then
  bad 'push refuses diverged'
else
  ok 'push refuses diverged'
fi
"$vendor" pull --force >/dev/null 2>&1
if grep -qx a3 "$work/skills/alpha/SKILL.md"; then
  ok 'pull --force discards local changes'
else
  bad 'pull --force discards local changes'
fi

printf 'b3\n' >"$work/skills/beta/SKILL.md"
pin_before=$(pin_of upstream.git)
"$vendor" push --branch feature -m 'beta' >/dev/null 2>&1
git -C "$work/seed" fetch -q origin feature
if git -C "$work/seed" show origin/feature:skills/beta/SKILL.md | grep -qx b3 &&
  [ "$(pin_of upstream.git)" = "$pin_before" ]; then
  ok 'push --branch publishes a branch and keeps the pin'
else
  bad 'push --branch publishes a branch and keeps the pin'
fi
expect_check 'branch pending' 1 'beta +local ahead'

rc=0
"$vendor" bogus >/dev/null 2>&1 || rc=$?
if [ "$rc" -eq 64 ]; then ok 'unknown action exits 64'; else bad "unknown action exits $rc"; fi

printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
