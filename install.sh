#! /usr/bin/env sh

CURRENT_FILE_PATH="$(pwd)/$(dirname $0)"
export DOTFILES_PATH=${CURRENT_FILE_PATH%"/."}

echo "👉 dotfiles path: '$DOTFILES_PATH'"

echo ""
echo "Installing custom packages"
echo ""

sh "$DOTFILES_PATH/mac/install.sh"

# Zsh
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zshrc" "$HOME/.zshrc"
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zprofile" "$HOME/.zprofile"
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zimrc" "$HOME/.zimrc"
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zlogin" "$HOME/.zlogin"

# Git
ln -s -i "$DOTFILES_PATH/git/.gitconfig" "$HOME/.gitconfig"
ln -s -i "$DOTFILES_PATH/git/.gitignore_global" "$HOME/.gitignore_global"
ln -s -i "$DOTFILES_PATH/git/.gitattributes" "$HOME/.gitattributes"

# GPG
ln -s -i "$DOTFILES_PATH/mac/gnupg/gpg-agent.conf" "$HOME/.gnupg/gpg-agent.conf"

# Change default terminal to ZSH
chsh -s "$(command -v zsh)"

# Install zimfw
curl -fsSL https://raw.githubusercontent.com/zimfw/install/master/install.zsh | zsh
