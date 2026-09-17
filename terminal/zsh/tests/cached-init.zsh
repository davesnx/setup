#!/bin/zsh

set -eu

root=${0:A:h:h:h:h}
# A template keeps macOS mktemp inside TMPDIR.
work=$(mktemp -d "${TMPDIR:-/tmp}/cached-init.XXXXXX")
work=${work:A}
trap 'rm -rf "$work"' EXIT HUP INT TERM

fail() {
  print -u2 -- "FAIL: $1"
  exit 1
}

export XDG_CACHE_HOME="$work/cache"
log="$work/log"
cache="$work/cache/zsh/fake.zsh"
mkdir -p "$work/bin1" "$work/bin2"
cat >"$work/bin1/fake" <<EOF
#!/bin/sh
echo run >>"$log"
printf 'typeset -g fake_loaded=%s\n' "\$(wc -l <"$log" | tr -d ' ')"
EOF
chmod +x "$work/bin1/fake"
touch -t 202001010000 "$work/bin1/fake"

source "$root/terminal/zsh/cached-init.zsh"
path=("$work/bin1" $path)

runs() { wc -l <"$log" | tr -d ' '; }

fake_loaded=0
_cached_init fake init zsh
[[ "$(runs)" == 1 ]] || fail "first call did not run the tool"
[[ "$(head -1 "$cache")" == "# $work/bin1/fake" ]] || fail "cache does not start with the resolved path"
[[ "$fake_loaded" == 1 ]] || fail "first call did not source the output"
echo "PASS: first call runs the tool and caches its output"

fake_loaded=0
_cached_init fake init zsh
[[ "$(runs)" == 1 ]] || fail "second call ran the tool again"
[[ "$fake_loaded" == 1 ]] || fail "second call did not source the cache"
echo "PASS: second call sources the cache without running the tool"

touch -t 203001010000 "$work/bin1/fake"
_cached_init fake init zsh
[[ "$(runs)" == 2 ]] || fail "newer tool did not rebuild the cache"
echo "PASS: a newer tool rebuilds the cache"

cp "$work/bin1/fake" "$work/bin2/fake"
touch -t 202001010000 "$work/bin2/fake"
path=("$work/bin2" ${path:#$work/bin1})
hash -r
_cached_init fake init zsh
[[ "$(runs)" == 3 ]] || fail "tool at another path did not rebuild the cache"
[[ "$(head -1 "$cache")" == "# $work/bin2/fake" ]] || fail "cache kept the old path"
echo "PASS: a tool at another path rebuilds the cache"

broken_log="$work/broken.log"
cat >"$work/bin2/broken" <<EOF
#!/bin/sh
echo run >>"$broken_log"
echo 'typeset -g broken_loaded=1'
exit 1
EOF
chmod +x "$work/bin2/broken"
touch -t 202001010000 "$work/bin2/broken"
hash -r # the earlier lookup hashed bin2 before broken existed
broken_loaded=0
if _cached_init broken; then fail "failed tool reported success"; fi
[[ -e "$work/cache/zsh/broken.zsh" && ! -s "$work/cache/zsh/broken.zsh" ]] || fail "failed tool did not leave an empty cache"
[[ "$broken_loaded" == 0 ]] || fail "failed tool output was sourced"
if _cached_init broken; then fail "failed tool reported success on retry"; fi
[[ "$(wc -l <"$broken_log" | tr -d ' ')" == 2 ]] || fail "failed tool was not run again"
echo "PASS: a failing tool leaves an empty cache and runs again next time"

_cached_init missing-cached-init-tool || fail "missing command did not return 0"
[[ ! -e "$work/cache/zsh/missing-cached-init-tool.zsh" ]] || fail "missing command created a cache"
echo "PASS: a missing command is skipped"
