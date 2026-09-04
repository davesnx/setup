#! /bin/sh

set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <setup-path>" >&2
  exit 64
fi

setup_path=$1

if [ ! -f "$setup_path/mac/brew/Brewfile" ]; then
  echo "Invalid setup path: $setup_path" >&2
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

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 69
fi

if [ ! -x /bin/bash ]; then
  echo "/bin/bash is required." >&2
  exit 69
fi

find_brew() {
  brew_path=$(command -v brew 2>/dev/null || true)
  case "$brew_path" in
    /*)
      if [ -x "$brew_path" ]; then
        return 0
      fi
      ;;
  esac

  for brew_path in ${BREW_SEARCH_PATHS:-/opt/homebrew/bin/brew /usr/local/bin/brew}; do
    if [ -x "$brew_path" ]; then
      return 0
    fi
  done

  brew_path=
  return 1
}

if ! find_brew; then
  homebrew_installer=$(mktemp "${TMPDIR:-/tmp}/homebrew-install.XXXXXX")
  trap 'rm -f "$homebrew_installer"' EXIT HUP INT TERM
  curl -fsSL -o "$homebrew_installer" https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh
  /bin/bash "$homebrew_installer"
  rm -f "$homebrew_installer"
  trap - EXIT HUP INT TERM

  if ! find_brew; then
    echo "Homebrew installation completed, but brew was not found." >&2
    exit 69
  fi
fi

# All apps (This line is 2 times because there are dependencies between brew cask and brew)
"$brew_path" bundle --file="$setup_path/mac/brew/Brewfile"
"$brew_path" bundle --file="$setup_path/mac/brew/Brewfile"

# GPG
mkdir -p "$HOME/.gnupg"
ln -s -i "$setup_path/mac/gnupg/gpg-agent.conf" "$HOME/.gnupg/gpg-agent.conf"

# Remove bash last login
touch "$HOME/.hushlogin"

# VS Code
ln -sf "$setup_path/mac/editors/vscode/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
ln -sf "$setup_path/mac/editors/vscode/keybindings.json" "$HOME/Library/Application Support/Code/User/keybindings.json"

# Cursor
ln -sf "$setup_path/mac/editors/vscode/settings.json" "$HOME/Library/Application Support/Cursor/User/settings.json"
ln -sf "$setup_path/mac/editors/vscode/keybindings.json" "$HOME/Library/Application Support/Cursor/User/keybindings.json"

# Zed
mkdir -p "$HOME/.config/zed/themes"
ln -sf "$setup_path/mac/editors/zed/settings.json" "$HOME/.config/zed/settings.json"
ln -sf "$setup_path/mac/editors/zed/keymap.json" "$HOME/.config/zed/keymap.json"
ln -sf "$setup_path/mac/editors/zed/fosk.json" "$HOME/.config/zed/themes/fosk.json"

# Ghostty
ln -sf "$setup_path/mac/ghostty/config.conf" "$HOME/.config/ghostty/config"

# Open remote Linux browser links on this Mac.
opener_bin="$HOME/.local/bin/xdg-open-listener"
opener_agent="$HOME/Library/LaunchAgents/com.davesnx.xdg-open.plist"
claude_remote_bin="$HOME/.local/bin/ensure-claude-remote-control"
claude_remote_agent="$HOME/Library/LaunchAgents/com.davesnx.claude-remote-control.plist"
ghostty_remote_bin="$HOME/.local/bin/ghostty-remote-tmux"
mkdir -p "$HOME/.local/bin" "$HOME/Library/LaunchAgents"

if [ -e "$opener_bin" ] && [ ! -L "$opener_bin" ]; then
  echo "Cannot replace opener executable: $opener_bin" >&2
  exit 73
fi
if [ -e "$opener_agent" ] && [ ! -L "$opener_agent" ]; then
  echo "Cannot replace LaunchAgent: $opener_agent" >&2
  exit 73
fi
if [ -e "$claude_remote_bin" ] && [ ! -L "$claude_remote_bin" ]; then
  echo "Cannot replace Claude Remote Control executable: $claude_remote_bin" >&2
  exit 73
fi
if [ -e "$claude_remote_agent" ] && [ ! -L "$claude_remote_agent" ]; then
  echo "Cannot replace LaunchAgent: $claude_remote_agent" >&2
  exit 73
fi
if [ -e "$ghostty_remote_bin" ] && [ ! -L "$ghostty_remote_bin" ]; then
  echo "Cannot replace ghostty-remote-tmux executable: $ghostty_remote_bin" >&2
  exit 73
fi

ln -sfn "$setup_path/terminal/bin/xdg-open-listener" "$opener_bin"
ln -sfn "$setup_path/mac/launch-agents/com.davesnx.xdg-open.plist" "$opener_agent"
ln -sfn "$setup_path/terminal/bin/ensure-claude-remote-control" "$claude_remote_bin"
ln -sfn "$setup_path/mac/launch-agents/com.davesnx.claude-remote-control.plist" "$claude_remote_agent"
ln -sfn "$setup_path/terminal/bin/ghostty-remote-tmux" "$ghostty_remote_bin"

launch_domain="gui/$(id -u)"
launchctl bootout "$launch_domain/com.davesnx.xdg-open" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$opener_agent"
launchctl bootout "$launch_domain/com.davesnx.claude-remote-control" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$claude_remote_agent"
