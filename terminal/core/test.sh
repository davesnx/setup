#!/usr/bin/env bash

# Also run with zsh: the interactive shell shares these helpers.
set -euo pipefail
root=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
export DOTFILES_PATH="$root" TERM=dumb
LOG_FILE="$work/messages.log"
unset DOT_MAIN_SOURCED DOT_COLORS_EXPORTED
source "$DOTFILES_PATH/terminal/core/main.sh"

assert_equal() {
  if [[ "$1" != "$2" ]]; then
    printf 'Expected <%s>, got <%s>\n' "$1" "$2" >&2
    exit 1
  fi
}

args::total_is 3 'two words' '' '*'
args::has_no_args
if args::total_is 2 'two words'; then exit 1; fi
if args::has_no_args ''; then exit 1; fi

# contains_element has always returned 1 for a match and 0 for no match.
if coll::contains_element 'two words' other 'two words'; then exit 1; fi
if coll::contains_element '' other ''; then exit 1; fi
if coll::contains_element '*' literal '*'; then exit 1; fi
coll::contains_element absent 'two words' '' '*'
coll::contains_element absent
coll::is_empty ''
if coll::is_empty value; then exit 1; fi

message='100% done: two  spaces, * and literal \n'
assert_equal "$message" "$(log::note "$message" 2>&1)"
assert_equal "✔ $message" "$(log::success "$message" 2>&1)"
assert_equal "$(printf 'first\nsecond')" "$(log::note first second 2>&1)"
log_to_file=true
log::warning "$message" 2>"$work/stderr"
assert_equal "➜ $message" "$(<"$LOG_FILE")"
assert_equal "$(<"$LOG_FILE")" "$(<"$work/stderr")"
log_to_file=false
header=$(_header '100% complete')
assert_equal 60 "${#header}"
[[ "$header" == *' 100% complete '* ]]
assert_equal "$(printf '\033[1;31m')" "$(log::color red bold)"
assert_equal "$(printf '\033[0;34m')" "$(log::color blue)"
log::color reset >"$work/reset"
assert_equal "$(printf '\033[0m')" "$(<"$work/reset")"
printf 'PASS: shared shell helpers (%s)\n' "${ZSH_VERSION:-Bash $BASH_VERSION}"
