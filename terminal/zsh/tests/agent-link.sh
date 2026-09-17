#!/bin/sh

set -eu

root=$(CDPATH='' cd "$(dirname "$0")/../../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

mkdir -p "$work/.ssh"
ln -s "$root/terminal/zsh/.zshenv" "$work/.zshenv"
link="$work/.ssh/agent.sock"
sock="$work/agent.real"
# Bind relative to the directory: Unix socket paths are limited to ~104 bytes
# at bind time, but the resulting file works at any absolute path.
(cd "$work" && python3 -c 'import socket; socket.socket(socket.AF_UNIX).bind("agent.real")')

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

# Runs a zsh with only the given environment and prints the SSH_AUTH_SOCK it
# ends up with, so each case sees exactly the login environment it describes.
seen() {
  env -i HOME="$work" PATH="$PATH" "$@" zsh -c 'printenv SSH_AUTH_SOCK'
}

[ "$(seen SSH_CONNECTION=x SSH_AUTH_SOCK="$sock")" = "$link" ] || fail "did not switch to the link"
[ "$(readlink "$link")" = "$sock" ] || fail "did not link the live socket"
echo "PASS: links a live forwarded socket and uses the link"

[ "$(seen SSH_CONNECTION=x SSH_AUTH_SOCK="$work/missing")" = "$link" ] || fail "did not fall back to the link"
[ "$(readlink "$link")" = "$sock" ] || fail "a dead path replaced the link"
echo "PASS: keeps the link when the inherited socket is dead"

[ "$(seen SSH_CONNECTION=x SSH_AUTH_SOCK="$link")" = "$link" ] || fail "changed an already linked value"
[ "$(readlink "$link")" = "$sock" ] || fail "the link points at itself"
echo "PASS: never points the link at itself"

[ "$(seen SSH_AUTH_SOCK="$sock")" = "$sock" ] || fail "touched SSH_AUTH_SOCK without SSH_CONNECTION"
echo "PASS: does nothing outside an SSH session"

zsh_bin=$(command -v zsh)
actual=$(env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -c 'printenv DOTFILES_PATH')
[ "$actual" = "$root" ] || fail "non-login shell did not export DOTFILES_PATH"
actual=$(env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -c 'sh -c '\''printenv DOTFILES_PATH'\''')
[ "$actual" = "$root" ] || fail "child sh did not inherit DOTFILES_PATH"
echo "PASS: non-login shells export DOTFILES_PATH to child sh processes"

actual=$(env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -c 'printenv PATH')
[ "$actual" = "$work/.local/bin:/usr/bin:/bin" ] || fail "non-login shell PATH misses local binaries"
echo "PASS: non-login shells prepend local binaries to inherited PATH"

inherited="/usr/bin:$work/.local/bin:/bin"
actual=$(env -i HOME="$work" PATH="$inherited" "$zsh_bin" -c 'source ~/.zshenv; printenv PATH')
[ "$actual" = "$inherited" ] || fail "repeated loading changed an existing local bin entry"
echo "PASS: repeated loading preserves an existing local bin entry"

inherited="$work/.local/bin-other:/usr/bin:/bin"
actual=$(env -i HOME="$work" PATH="$inherited" "$zsh_bin" -c 'printenv PATH')
[ "$actual" = "$work/.local/bin:$inherited" ] || fail "similar path prevented local bin insertion"
echo "PASS: local bin matching uses whole PATH entries"

mkdir -p "$work/.local/bin"
ln -s /usr/bin/true "$work/.local/bin/setup-path-probe"
env -i HOME="$work" PATH=/usr/bin:/bin SSH_CONNECTION=x "$zsh_bin" -c \
  'setup-path-probe' || fail "non-login SSH command could not find local binaries"
echo "PASS: non-login SSH commands can run local binaries"

cat >"$work/.zprofile" <<'EOF'
OSTYPE=linux-gnu
source "$DOTFILES_PATH/terminal/zsh/.zprofile"
EOF
env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -dlc \
  'setup-path-probe' || fail "login shell PATH misses local binaries"
echo "PASS: login shells can run local binaries"

mkdir -p "$work/stubs"
for name in node npm; do
  printf '#!/bin/sh\nexit 0\n' >"$work/stubs/$name"
  chmod +x "$work/stubs/$name"
done

for config_home in "$work/.config" "$work/custom config"; do
  mkdir -p "$config_home/opencode/plugins/opencode-notify"
  env -i HOME="$work" PATH="$work/stubs:/usr/bin:/bin" DOTFILES_PATH="$root" \
    XDG_CONFIG_HOME="$config_home" sh "$root/terminal/opencode/install.sh" ssh >"$work/install.log"
  [ "$(readlink "$config_home/opencode/host.jsonc")" = "$root/terminal/opencode/hosts/ssh.jsonc" ] || fail "profile was not installed"
done

profile_seen() {
  env -i HOME="$work" PATH=/usr/bin:/bin "$@" "$zsh_bin" -dls <<'EOF'
print -r -- "${OPENCODE_CONFIG-unset}"
source ~/.zprofile
print -r -- "${OPENCODE_CONFIG-unset}"
EOF
}

expect_profile() {
  expected=$1
  shift
  actual=$(profile_seen "$@")
  [ "$actual" = "$(printf '%s\n%s' "$expected" "$expected")" ] || fail "profile lookup expected $expected, got $actual"
}

expect_profile "$work/.config/opencode/host.jsonc"
expect_profile "$work/.config/opencode/host.jsonc" XDG_CONFIG_HOME=
echo "PASS: default profile lookup survives repeated startup"
expect_profile "$work/custom config/opencode/host.jsonc" XDG_CONFIG_HOME="$work/custom config"
expect_profile "$work/custom config/opencode/host.jsonc" XDG_CONFIG_HOME="$work/custom config" OPENCODE_CONFIG=explicit.jsonc
echo "PASS: custom XDG profile takes precedence, including over inherited OPENCODE_CONFIG"
expect_profile unset XDG_CONFIG_HOME="$work/absent"
expect_profile explicit.jsonc XDG_CONFIG_HOME="$work/absent" OPENCODE_CONFIG=explicit.jsonc
rm "$work/.config/opencode/host.jsonc"
expect_profile unset
expect_profile explicit.jsonc OPENCODE_CONFIG=explicit.jsonc
echo "PASS: absent profiles leave OPENCODE_CONFIG unchanged"

cat >"$work/.local/bin/opencode" <<'EOF'
#!/bin/sh
printf 'opencode'
printf ' <%s>' "$@"
printf '\n'
EOF
chmod +x "$work/.local/bin/opencode"
actual=$(env -i HOME="$work" PATH=/usr/bin:/bin "$zsh_bin" -ds <<'EOF'
source "$DOTFILES_PATH/terminal/_aliases/alias.sh"
for name in oc occ; do
  [[ "${aliases[$name]}" != /* ]] || { print -u2 "FAIL: $name uses an absolute executable"; exit 1; }
done
opencode() { print "wrong function"; }
oc "two words"
occ "two words"
EOF
)
[ "$actual" = "$(printf '%s\n%s' 'opencode <two words>' 'opencode <--continue> <two words>')" ] || fail "oc/occ did not use the PATH executable: $actual"
echo "PASS: oc and occ find OpenCode on PATH and preserve arguments"
