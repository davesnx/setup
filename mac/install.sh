#! /bin/sh

if [ -z "${DOTFILES_PATH:-}" ]; then
  echo "DOTFILES_PATH must point to the setup repository." >&2
  exit 64
fi

if [ ! -f "$DOTFILES_PATH/mac/brew/Brewfile" ]; then
  echo "Invalid setup path: $DOTFILES_PATH" >&2
  exit 66
fi

if [ "$(uname -s)" != Darwin ]; then
  echo "This installer supports macOS only." >&2
  exit 69
fi

if [ -z "${HOME:-}" ] || [ ! -d "$HOME" ]; then
  echo "HOME must name an existing directory." >&2
  exit 69
fi

. "$DOTFILES_PATH/prelude.sh"

need curl
need /bin/bash

PATH="${BREW_SEARCH_PATHS:-/opt/homebrew/bin:/usr/local/bin}:$PATH"
if ! command -v brew >/dev/null 2>&1; then
  installer=$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)
  /bin/bash -c "$installer"
fi

brew_path=$(command -v brew) || {
  echo "Homebrew installation completed, but brew was not found." >&2
  exit 69
}

brew_env=$("$brew_path" shellenv sh)
eval "$brew_env"

"$brew_path" trust --tap jonahsnider/tap oven-sh/bun

# All apps (This line is 2 times because there are dependencies between brew cask and brew)
"$brew_path" bundle --file="$DOTFILES_PATH/mac/brew/Brewfile"
"$brew_path" bundle --file="$DOTFILES_PATH/mac/brew/Brewfile"

# GPG
link_path "$DOTFILES_PATH/mac/gnupg/gpg-agent.conf" "$HOME/.gnupg/gpg-agent.conf"

# Remove bash last login
touch "$HOME/.hushlogin"

# VS Code and Cursor share one settings and keybindings pair.
vscode="$DOTFILES_PATH/mac/editors/vscode"
link_path "$vscode/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
link_path "$vscode/keybindings.json" "$HOME/Library/Application Support/Code/User/keybindings.json"
link_path "$vscode/settings.json" "$HOME/Library/Application Support/Cursor/User/settings.json"
link_path "$vscode/keybindings.json" "$HOME/Library/Application Support/Cursor/User/keybindings.json"
link_path "$vscode/projects.json" "$HOME/Library/Application Support/Cursor/User/globalStorage/alefragnani.project-manager/projects.json"

# Zed
link_path "$DOTFILES_PATH/mac/editors/zed/settings.json" "$HOME/.config/zed/settings.json"
link_path "$DOTFILES_PATH/mac/editors/zed/keymap.json" "$HOME/.config/zed/keymap.json"
link_path "$DOTFILES_PATH/mac/editors/zed/fosk.json" "$HOME/.config/zed/themes/fosk.json"

# Ghostty
link_path "$DOTFILES_PATH/mac/ghostty/config.conf" "$HOME/.config/ghostty/config"

sh "$DOTFILES_PATH/mac/daemons/install.sh"
