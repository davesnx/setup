#!/usr/bin/env sh

set -eu

ROOT=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
FIXTURE='id: sample
skills_loaded: [one, two]
setup:
  fixtures:
    app.js: fixtures/app.js
checks:
  - kind: file_exists
    path: output.md
'

assert_equal() {
  actual=$1
  expected=$2
  if [ "$actual" != "$expected" ]; then
    printf 'Expected %s, got %s\n' "$expected" "$actual" >&2
    exit 1
  fi
}

assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -r '.id')" "sample"
assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -r '.missing // false')" "false"
assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -r '.checks | length')" "1"
assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -o=json '.setup.fixtures // {}')" '{"app.js":"fixtures/app.js"}'
assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -o=json '.skills_loaded // []')" '["one","two"]'
assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -o=json '.missing // []')" '[]'
assert_equal "$(printf '%s' "$FIXTURE" | "$ROOT/shims/yq" -r '.skills_loaded[]')" 'one
two'
