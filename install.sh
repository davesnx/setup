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

# Bash
ln -s -i "$DOTFILES_PATH/terminal/bash/.bashrc" "$HOME/.bashrc"
ln -s -i "$DOTFILES_PATH/terminal/bash/.bash_profile" "$HOME/.bash_profile"
ln -s -i "$DOTFILES_PATH/terminal/bash/.profile" "$HOME/.profile"

# Zsh
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zshrc" "$HOME/.zshrc"
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zimrc" "$HOME/.zimrc"
ln -s -i "$DOTFILES_PATH/terminal/zsh/.zlogin" "$HOME/.zlogin"

### Git stuff ###
ln -s -i "$DOTFILES_PATH/git/.gitconfig" "$HOME/.gitconfig"
ln -s -i "$DOTFILES_PATH/git/.gitignore_global" "$HOME/.gitignore_global"
ln -s -i "$DOTFILES_PATH/git/.gitattributes" "$HOME/.gitattributes"

### Editors stuff ###
ln -s -i "$DOTFILES_PATH/editors/vim/.vimrc" "$HOME/.vimrc"

# Change default terminal to ZSH
chsh -s "$(command -v zsh)"
git clone --recursive https://github.com/zimfw/zimfw.git "${ZDOTDIR:-${HOME}}/.zim"

# Create the autojump historic file
touch "$HOME/.z"
