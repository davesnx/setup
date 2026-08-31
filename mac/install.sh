#! /bin/sh

# Install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# All apps (This line is 2 times because there are dependencies between brew cask and brew)
brew bundle --file="$DOTFILES_PATH/mac/brew/Brewfile"
brew bundle --file="$DOTFILES_PATH/mac/brew/Brewfile"

# GPG
mkdir -p "$HOME/.gnupg"
ln -s -i "$DOTFILES_PATH/mac/gnupg/gpg-agent.conf" "$HOME/.gnupg/gpg-agent.conf"

# Remove bash last login
touch "$HOME/.hushlogin"

# Correct paths (so, we handle all with $PATH)
sudo truncate -s 0 /etc/paths

# VS Code
ln -sf "$DOTFILES_PATH/mac/editors/vscode/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
ln -sf "$DOTFILES_PATH/mac/editors/vscode/keybindings.json" "$HOME/Library/Application Support/Code/User/keybindings.json"

# Cursor
ln -sf "$DOTFILES_PATH/mac/editors/vscode/settings.json" "$HOME/Library/Application Support/Cursor/User/settings.json"
ln -sf "$DOTFILES_PATH/mac/editors/vscode/keybindings.json" "$HOME/Library/Application Support/Cursor/User/keybindings.json"

# Zed
ln -sf "$DOTFILES_PATH/mac/editors/zed/settings.json" "$HOME/.config/zed/settings.json"
ln -sf "$DOTFILES_PATH/mac/editors/zed/keymap.json" "$HOME/.config/zed/keymap.json"

# Ghostty
ln -sf "$DOTFILES_PATH/mac/ghostty/config.conf" "$HOME/.config/ghostty/config"

# Open remote Linux browser links on this Mac.
opener_bin="$HOME/.local/bin/xdg-open-listener"
opener_agent="$HOME/Library/LaunchAgents/com.davesnx.xdg-open.plist"
mkdir -p "$HOME/.local/bin" "$HOME/Library/LaunchAgents"

if [ -e "$opener_bin" ] && [ ! -L "$opener_bin" ]; then
  echo "Cannot replace opener executable: $opener_bin" >&2
  exit 73
fi
if [ -e "$opener_agent" ] && [ ! -L "$opener_agent" ]; then
  echo "Cannot replace LaunchAgent: $opener_agent" >&2
  exit 73
fi

ln -sfn "$DOTFILES_PATH/terminal/bin/xdg-open-listener" "$opener_bin"
ln -sfn "$DOTFILES_PATH/mac/launch-agents/com.davesnx.xdg-open.plist" "$opener_agent"

launch_domain="gui/$(id -u)"
launchctl bootout "$launch_domain/com.davesnx.xdg-open" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$opener_agent"
