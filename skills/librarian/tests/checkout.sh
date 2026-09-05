#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
checkout="$skill_dir/checkout.sh"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT

fake_bin="$test_root/bin"
mkdir -p "$fake_bin"
cat > "$fake_bin/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_GIT_LOG"

if [[ "$1" == "clone" ]]; then
  checkout_path="${@: -1}"
  mkdir -p "$checkout_path/.git"
  printf '%s\n' "${@: -2:1}" > "$checkout_path/.git/fake-origin"
  exit 0
fi

checkout_path="$2"
shift 2
case "$1 $2" in
  "remote get-url")
    cat "$checkout_path/.git/fake-origin"
    ;;
  "remote add"|"remote set-url")
    printf '%s\n' "${@: -1}" > "$checkout_path/.git/fake-origin"
    ;;
  "fetch --prune")
    ;;
  "symbolic-ref --short")
    printf '%s\n' main
    ;;
  "rev-parse --abbrev-ref")
    printf '%s\n' origin/main
    ;;
  "status --porcelain")
    ;;
  "merge --ff-only")
    ;;
  *)
    printf 'unexpected fake git call: %s\n' "$*" >&2
    exit 1
    ;;
esac
EOF
chmod +x "$fake_bin/git"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

run_valid() {
  local name="$1" input="$2" expected="$3" home log output
  home="$test_root/$name/home"
  log="$test_root/$name/git.log"
  mkdir -p "$home"
  : > "$log"
  output="$(HOME="$home" FAKE_GIT_LOG="$log" PATH="$fake_bin:$PATH" \
    bash "$checkout" "$input" --path-only)"
  [[ "$output" == "$home/.librarian/$expected" ]] ||
    fail "$name returned $output"
  [[ -s "$log" ]] || fail "$name did not use fake git"
}

run_invalid() {
  local name="$1" input="$2" home log
  home="$test_root/$name/home"
  log="$test_root/$name/git.log"
  mkdir -p "$home"
  : > "$log"
  if HOME="$home" FAKE_GIT_LOG="$log" PATH="$fake_bin:$PATH" \
    bash "$checkout" "$input" --path-only >/dev/null 2>&1; then
    fail "$name accepted invalid input"
  fi
  [[ ! -s "$log" ]] || fail "$name invoked git"
  [[ ! -e "$home/.librarian" ]] || fail "$name wrote to the cache"
}

run_valid shorthand owner/repo github.com/owner/repo
run_valid https https://github.com/owner/repo github.com/owner/repo
run_valid scp-ssh git@github.com:owner/repo.git github.com/owner/repo
run_valid url-ssh ssh://git@github.com/owner/repo.git github.com/owner/repo
run_valid deep-link https://github.com/owner/repo/tree/main github.com/owner/repo

run_invalid missing-path github.com
run_invalid traversal github.com/../../.ssh/repo
run_invalid malformed-host https://github.com@evil.example/owner/repo
run_invalid malformed-path https://github.com/owner/repo/name\ with\ spaces

symlink_home="$test_root/symlink/home"
symlink_log="$test_root/symlink/git.log"
outside="$test_root/symlink/outside"
mkdir -p "$symlink_home/.librarian" "$outside"
ln -s "$outside" "$symlink_home/.librarian/github.com"
: > "$symlink_log"
if HOME="$symlink_home" FAKE_GIT_LOG="$symlink_log" PATH="$fake_bin:$PATH" \
  bash "$checkout" owner/repo --path-only >/dev/null 2>&1; then
  fail "symlink parent was accepted"
fi
[[ ! -s "$symlink_log" ]] || fail "symlink parent invoked git"
[[ -z "$(find "$outside" -mindepth 1 -print -quit)" ]] ||
  fail "symlink parent wrote outside the cache"

printf 'PASS: librarian checkout offline tests\n'
