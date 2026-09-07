#! /usr/bin/env sh

set -eu

setup_path="$(CDPATH='' cd "$(dirname "$0")" && pwd)"

if [ ! -f "$setup_path/mac/brew/Brewfile" ]; then
  echo "Invalid setup path: $setup_path" >&2
  exit 66
fi

if [ -z "${HOME:-}" ] || [ ! -d "$HOME" ]; then
  echo "HOME must name an existing directory." >&2
  exit 69
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 69
fi

if [ ! -x /bin/bash ]; then
  echo "/bin/bash is required." >&2
  exit 69
fi

if ! command -v zsh >/dev/null 2>&1; then
  echo "zsh is required." >&2
  exit 69
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 69
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install the eval harness." >&2
  exit 69
fi

echo "👉 dotfiles path: '$setup_path'"

# One backup directory per run for every folder installer.
. "$setup_path/link.sh"

if [ "$(uname -s)" = Darwin ]; then
  echo ""
  echo "Installing custom packages"
  echo ""
  sh "$setup_path/mac/install.sh" "$setup_path"
fi

sh "$setup_path/git/install.sh"
sh "$setup_path/local/install.sh"
sh "$setup_path/ssh/install.sh"
sh "$setup_path/terminal/zsh/install.sh"
sh "$setup_path/terminal/tmux/install.sh"
sh "$setup_path/terminal/htop/install.sh"

# Shared agent rules and skills first; Claude Code and OpenCode link into them.
sh "$setup_path/agents/install.sh"
sh "$setup_path/terminal/claude/install.sh"
sh "$setup_path/terminal/opencode/install.sh"

sh "$setup_path/terminal/bin/eval-harness/install.sh"
