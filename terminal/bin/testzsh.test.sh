#!/usr/bin/env bash

set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
zsh_bin=$(type -P zsh)
bash_bin=$BASH
scratch=$(mktemp -d "${TMPDIR:-/tmp}/testzsh-test.XXXXXXXX")
trap 'rm -rf -- "$scratch"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p "$scratch/home" "$scratch/tmp" "$scratch/bin" "$scratch/custom dir" "$scratch/changed dir"
cat >"$scratch/bin/zsh" <<'SH'
#!/bin/sh
set -eu
if [ -n "${_TESTZSH_MODE-}" ]; then
  bootstrap=$ZDOTDIR/.zshenv
  case ${FAULT-} in
    function-trap) printf 'TRAPDEBUG() { return 0; }\n' >"$FIXTURE/prefix" ;;
    list-trap) printf "trap ':' DEBUG\n" >"$FIXTURE/prefix" ;;
    *) : >"$FIXTURE/prefix" ;;
  esac
  cat "$bootstrap" >>"$FIXTURE/prefix"
  cat "$FIXTURE/prefix" >"$bootstrap"
  cat >>"$bootstrap" <<'ZSH'
print -r -- "${+ZDOTDIR}:${ZDOTDIR-}:${parameters[ZDOTDIR]-}" >"$FIXTURE/zdotdir-state"
ZSH
  "$REAL_ZSH" -f -n "$bootstrap" || exit 80
  printf 'checked\n' >>"$FIXTURE/syntax"
  case ${FAULT-} in
    redirect) export ZDOTDIR=$HOME ;;
    no-report) exec 3>/dev/null ;;
  esac
fi
exec "$REAL_ZSH" "$@"
SH
chmod +x "$scratch/bin/zsh"
test_path="$scratch/bin:/usr/bin:/bin"
home=$scratch/home

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}
run() {
  env -i HOME="$home" PATH="$test_path" TERM=dumb TMPDIR="$scratch/tmp" \
    FIXTURE="$scratch" REAL_ZSH="$zsh_bin" "$@" "$bash_bin" "$root/testzsh" ${mode[@]+"${mode[@]}"} >"$scratch/out" 2>"$scratch/err"
}
success() {
  run "$@" || fail "startup: $(<"$scratch/err")"
}
clean() {
  [[ -z $(ls -A "$scratch/tmp") ]] || fail 'temporary files remain'
  [[ ! -e $scratch/logout ]] || fail '.zlogout ran'
  [[ $(<"$home/history") == original ]] || fail 'history changed'
}

printf 'original\n' >"$home/history"
cat >"$home/.zshenv" <<'ZSH'
# Ubuntu's /etc/zsh/zshrc runs compinit; its autoload stub has no source file
# and would add a second (unknown) event to the trace.
skip_global_compinit=1
print -r -- "env:${ZDOTDIR+x}:${ZDOTDIR-}:$ZSH_BENCHMARK" >>"$FIXTURE/order"
[[ -o login && -o interactive ]] || exit 71
[[ $ZSH_EVAL_CONTEXT == *file && $ZSH_EVAL_CONTEXT != *shfunc* ]] || exit 72
ZSH
cat >"$home/.zprofile" <<'ZSH'
print profile >>"$FIXTURE/order"
profile_cost() { sleep 0.01; }
profile_cost
ZSH
cat >"$home/.zshrc" <<'ZSH'
print rc >>"$FIXTURE/order"
HISTFILE=$HOME/history
SAVEHIST=100
ZSH
cat >"$home/.zlogin" <<'ZSH'
print login >>"$FIXTURE/order"
login_cost() { sleep 0.01; }
login_cost
ZSH
cat >"$home/.zlogout" <<'ZSH'
print logout >"$FIXTURE/logout"
ZSH

mode=()
success
[[ $(wc -l <"$scratch/err") -eq 25 ]] || fail 'expected exactly 25 timing lines'
[[ $(grep -Ec '^real [0-9]+\.[0-9]{3}s[[:space:]]+user [0-9]+\.[0-9]{3}s[[:space:]]+sys [0-9]+\.[0-9]{3}s$' "$scratch/err") -eq 25 ]] || fail 'timing format'
[[ ! -s $scratch/out ]] || fail 'startup output escaped timing mode'
awk 'NR % 4 == 1 && $0 != "env:::1" {exit 1} NR % 4 == 2 && $0 != "profile" {exit 1} NR % 4 == 3 && $0 != "rc" {exit 1} NR % 4 == 0 && $0 != "login" {exit 1} END {if (NR != 100) exit 1}' "$scratch/order" || fail 'startup order or benchmark flag'
clean

mode=(--profile)
: >"$scratch/order"
success
[[ $(<"$scratch/order") == $'env:::1\nprofile\nrc\nlogin' ]] || fail 'profile startup order'
[[ $(<"$scratch/zdotdir-state") == '0::' ]] || fail 'unset ZDOTDIR not restored'
grep -q profile_cost "$scratch/out" || fail 'profile function missing'
grep -q login_cost "$scratch/out" || fail 'login function missing'
[[ ! -s $scratch/err ]] || fail 'profile stderr'
clean

cat >"$home/.zshrc" <<'ZSH'
HISTFILE=$HOME/history
SAVEHIST=100
source "$FIXTURE/sourced file"
value=$(sleep 0.12; print 'SECRET_MARKER')
secret=SECRET_MARKER
print -r -- SECRET_MARKER
print -r -- SECRET_MARKER >&2
eval 'secret=SECRET_MARKER'
setopt xtrace
print SECRET_MARKER
unsetopt xtrace
false
[[ $? == 1 ]] || exit 73
false || print recovered >>"$FIXTURE/status-ok"
if false; then exit 74; fi
setopt errexit
false || print errexit-ok >>"$FIXTURE/status-ok"
false
[[ $? == 1 ]] || exit 76
unsetopt errexit
ZSH
printf 'sleep 0.12\n' >"$scratch/sourced file"
printf 'sleep 0.12\n' >"$home/.zlogin"
mode=(--trace)
success
[[ ! -s $scratch/err ]] || fail 'trace stderr'
if grep -q SECRET_MARKER "$scratch/out" "$scratch/err"; then fail 'secret leaked'; fi
grep -q '^recovered$' "$scratch/status-ok" || fail 'status changed'
grep -q '^errexit-ok$' "$scratch/status-ok" || fail 'errexit control flow changed'
# Each sleep belongs to one parent source location, including the final .zlogin interval.
for location in 'sourced file:1' '.zshrc:4' '.zlogin:1'; do
  awk -F '\t' -v location="$location" 'index($3, location) {found++; if ($1 < 80 || $1 > 1000 || $2 != 1) exit 1} END {if (found != 1) exit 1}' "$scratch/out" || fail "sleep attribution: $location"
done
awk -F '\t' '/^Top 20/ {exit} NF == 3 {sum += $1} END {if (sum < 240 || sum > 900) exit 1}' "$scratch/out" || fail 'exclusive costs double counted'
# The .zshrc total may exceed its own subshell line only by the cost of its other
# lines. A double-counted source or subshell would add at least 120 ms.
awk -F '\t' '/^Top 20/ {lines = 1; next} !lines && $3 ~ /\.zshrc[^:]*$/ {file = $1; files++} lines && $3 ~ /\.zshrc:4[^0-9]/ {line = $1; found++} END {if (files != 1 || found != 1 || file < line || file - line > 100) exit 1}' "$scratch/out" || fail 'source or subshell cost counted twice in .zshrc'
clean
success
clean

# Control characters in source filenames must stay on one escaped report line.
printf ':\n' >"$scratch/line"$'\n\t\033'"quote'"
cat >>"$home/.zshrc" <<'ZSH'
source "$FIXTURE/line"$'\n\t\033'"quote'"
ZSH
success
LC_ALL=C awk '/[[:cntrl:]]/ {line=$0; gsub(/\t/, "", line); if (line ~ /[[:cntrl:]]/) exit 1}' "$scratch/out" || fail 'unescaped source label'
grep -Fq '\n\t' "$scratch/out" || fail 'escaped filename missing'
clean

# Functions assigned through this array have a line number but no source file.
cat >>"$home/.zshrc" <<'ZSH'
functions[anonymous_cost]='sleep 0.12'
anonymous_cost
ZSH
success
awk -F '\t' -v empty="\$''" 'NF == 3 && ($3 == empty || substr($3, 1, 3) == substr(empty, 1, 2) ":") {exit 1}' "$scratch/out" || fail 'empty escaped source filename'
for label in "\$'(unknown)'" "\$'(unknown):1'"; do
  awk -F '\t' -v label="$label" '$3 == label {found++; if ($1 < 80 || $1 > 1000 || $2 != 1) exit 1} END {if (found != 1) exit 1}' "$scratch/out" || fail 'anonymous source attribution'
done
clean

# The same secret-bearing startup must stay private in zprof mode.
mode=(--profile)
success
if grep -q SECRET_MARKER "$scratch/out" "$scratch/err"; then fail 'profile secret leaked'; fi
clean

for directory in "$scratch/custom dir" "$scratch/changed dir"; do
  for stage in profile rc login; do
    filename=.z$stage
    [[ $stage != rc ]] || filename=.zshrc
    cat >"$directory/$filename" <<ZSH
print '${directory##*/}-$stage' >>"\$FIXTURE/order"
ZSH
  done
done
cat >"$scratch/custom dir/.zshenv" <<'ZSH'
[[ $ZDOTDIR == "$FIXTURE/custom dir" ]] || exit 75
print custom-env >>"$FIXTURE/order"
if [[ ${CHANGE_ZDOTDIR-no} == yes ]]; then
  export ZDOTDIR="$FIXTURE/changed dir"
fi
ZSH
for option in --profile --trace; do
  mode=("$option")
  : >"$scratch/order"
  success ZDOTDIR="$scratch/custom dir"
  [[ $(<"$scratch/order") == $'custom-env\ncustom dir-profile\ncustom dir-rc\ncustom dir-login' ]] || fail 'custom ZDOTDIR order'
  [[ $(<"$scratch/zdotdir-state") == "1:$scratch/custom dir:scalar-export" ]] || fail 'custom exported ZDOTDIR not restored'
  : >"$scratch/order"
  success ZDOTDIR="$scratch/custom dir" CHANGE_ZDOTDIR=yes
  [[ $(<"$scratch/order") == $'custom-env\nchanged dir-profile\nchanged dir-rc\nchanged dir-login' ]] || fail 'changed ZDOTDIR order'
  clean
done

# Empty ZDOTDIR means /.zshenv, not $HOME/.zshenv.
for option in --profile --trace; do
  mode=("$option")
  : >"$scratch/order"
  success ZDOTDIR=
  [[ $(<"$scratch/zdotdir-state") == '1::scalar-export' ]] || fail 'empty exported ZDOTDIR not restored'
  [[ ! -s $scratch/order ]] || fail 'empty ZDOTDIR incorrectly used HOME'
  clean
done

# An early exit owns its shutdown: the fixed end command cannot suppress it.
rm "$home/.zlogout"

for option in --profile --trace ''; do
  mode=()
  [[ -z $option ]] || mode=("$option")
  for ending in 'exit 0' 'exit 7' 'exec /usr/bin/true' 'exec 4>&-'; do
    printf '%s\n' "$ending" >"$home/.zshenv"
    if run; then fail "accepted incomplete startup: $option $ending"; fi
    [[ ! -s $scratch/out ]] || fail 'failed startup exposed partial report'
    clean
  done
done

: >"$home/.zshenv"
for option in --profile --trace; do
  mode=("$option")
  for fault in redirect no-report; do
    if run FAULT="$fault"; then fail "accepted missing bootstrap/report: $fault"; fi
    [[ ! -s $scratch/out ]] || fail 'partial report exposed'
    clean
  done
done
mode=(--trace)
for fault in function-trap list-trap; do
  if run FAULT="$fault"; then fail "accepted preceding DEBUG trap: $fault"; fi
  grep -q 'DEBUG trap' "$scratch/err" || fail 'missing preceding DEBUG explanation'
  clean
done

for trap_code in 'TRAPDEBUG() { return 0; }' "trap ':' DEBUG" 'unfunction TRAPDEBUG' 'unsetopt debugbeforecmd'; do
  printf '%s\n' "$trap_code" >"$home/.zshenv"
  mode=(--trace)
  if run; then fail "accepted changed DEBUG trap: $trap_code"; fi
  grep -q 'DEBUG trap' "$scratch/err" || fail 'missing DEBUG conflict explanation'
  clean
done

cat >"$home/.zshenv" <<'ZSH'
_testzsh_started=$(( EPOCHREALTIME + 100 ))
:
ZSH
if run; then fail 'accepted backwards clock interval'; fi
grep -q 'clock moved backwards' "$scratch/err" || fail 'missing clock explanation'
clean

mode=(--help)
success
grep -q '^Usage: testzsh' "$scratch/out" || fail 'help missing'
for argument in --bad ''; do
  mode=("$argument")
  result=0
  run || result=$?
  [[ $result -eq 2 ]] || fail 'invalid argument status'
done
mode=(--trace --profile)
result=0
run || result=$?
[[ $result -eq 2 ]] || fail 'extra argument status'
clean
[[ -s $scratch/syntax ]] || fail 'bootstrap syntax was not checked'
printf 'testzsh tests passed.\n'
