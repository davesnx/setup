#! /bin/sh

# Install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# All apps (This line is 2 times because there are dependencies between brew cask and brew)
brew bundle --file="$DOTFILES_PATH/mac/brew/Brewfile"
brew bundle --file="$DOTFILES_PATH/mac/brew/Brewfile"

# Remove bash last login
touch "$HOME/.hushlogin"

# Correct paths (so, we handle all with $PATH)
sudo truncate -s 0 /etc/paths

# VS Code
ln -s "$DOTFILES_PATH/editors/vs-code/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
ln -s "$DOTFILES_PATH/editors/vs-code/keybindings.json" "$HOME/Library/Application Support/Code/User/keybindings.json"
