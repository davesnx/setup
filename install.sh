#!/usr/bin/env sh

CURRENT_FILE_PATH="$(pwd)/$(dirname $0)"
export DOTFILES_PATH=${CURRENT_FILE_PATH%"/."}

echo "👉 dotfiles path: '$DOTFILES_PATH'"

OPERATIVE_SYSTEM="MacOS "
CUSTOM_INSTALLER="$DOTFILES_PATH/mac/install.sh"

echo "👉 OS: $OPERATIVE_SYSTEM"
echo ""
echo "👇 Installing $OPERATIVE_SYSTEM custom packages 👇"
echo ""

sh "$CUSTOM_INSTALLER"

# Common stuff
# -----------------------------------------------
echo "👇 Installing $OPERATIVE_SYSTEM common packages 👇"

# Zsh
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zshrc" "$HOME/.zshrc"
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zimrc" "$HOME/.zimrc"

# Git
ln -s -i "$DOTFILES_PATH/git/.gitconfig" "$HOME/.gitconfig"
ln -s -i "$DOTFILES_PATH/git/.gitignore_global" "$HOME/.gitignore_global"
ln -s -i "$DOTFILES_PATH/git/.gitattributes" "$HOME/.gitattributes"

# Change default terminal to ZSH
chsh -s "$(command -v zsh)"

# Create the autojump historic file
touch "$HOME/.z"

# Install zimfw
curl -fsSL https://raw.githubusercontent.com/zimfw/install/master/install.zsh | zsh
