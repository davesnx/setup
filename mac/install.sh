#!/bin/sh

# Install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# All apps (This line is 2 times because there are dependencies between brew cask and brew)
brew bundle --file="$DOTFILES_PATH/brew/Brewfile"
brew bundle --file="$DOTFILES_PATH/brew/Brewfile"

# Remove bash last login
touch "$HOME/.hushlogin"

# Correct paths (so, we handle all with $PATH)
sudo truncate -s 0 /etc/paths

# Sublime Text
ln -s -i "$DOTFILES_PATH/editors/sublime-text-3" "$HOME/Library/Application Support/Sublime Text 3/Packages/User"

# VS Code
ln -s "$DOTFILES_PATH/editors/vs-code/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
ln -s "$DOTFILES_PATH/editors/vs-code/keybindings.json" "$HOME/Library/Application Support/Code/User/keybindings.json"

# global node packages
# list=(bs-platform, nodemon, eslint, reason-cli, vtop, concurrently, )
