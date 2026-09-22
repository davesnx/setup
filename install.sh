#! /usr/bin/env sh

DOTFILES_PATH="$(CDPATH='' cd "$(dirname "$0")" && pwd)"
export DOTFILES_PATH

if [ ! -f "$DOTFILES_PATH/mac/brew/Brewfile" ]; then
  echo "Invalid setup path: $DOTFILES_PATH" >&2
  exit 66
fi

if [ -z "${HOME:-}" ] || [ ! -d "$HOME" ]; then
  echo "HOME must name an existing directory." >&2
  exit 69
fi

# shellcheck disable=SC1091
. "$DOTFILES_PATH/prelude.sh"

need curl
need /bin/bash
need zsh
need git

echo "👉 dotfiles path: '$DOTFILES_PATH'"

if [ "$(uname -s)" = Darwin ]; then
  echo ""
  echo "Installing custom packages"
  echo ""
  sh "$DOTFILES_PATH/mac/install.sh"
  PATH="${BREW_SEARCH_PATHS:-/opt/homebrew/bin:/usr/local/bin}:$PATH"
fi

sh "$DOTFILES_PATH/terminal/node/install.sh"
# The Node installer runs in a child shell; activate its default here too.
fnm_env=$(fnm env --shell bash)
eval "$fnm_env"
fnm use default
need npm
PATH="$HOME/.local/share/node-tools/node_modules/.bin:$PATH"

sh "$DOTFILES_PATH/git/install.sh"
sh "$DOTFILES_PATH/local/install.sh"
sh "$DOTFILES_PATH/terminal/zsh/install.sh"
sh "$DOTFILES_PATH/terminal/herdr/install.sh"
sh "$DOTFILES_PATH/terminal/htop/install.sh"

# Shared agent rules and skills first; Claude Code and OpenCode link into them.
sh "$DOTFILES_PATH/agents/install.sh"
sh "$DOTFILES_PATH/terminal/claude/install.sh"
sh "$DOTFILES_PATH/terminal/opencode/install.sh"

sh "$DOTFILES_PATH/terminal/bin/eval-harness/install.sh"
sh "$DOTFILES_PATH/terminal/bin/ocs/install.sh"
