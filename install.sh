#! /usr/bin/env sh

export DOTFILES_PATH="$(CDPATH='' cd "$(dirname "$0")" && pwd)"

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

# Tmux
ln -s -i "$DOTFILES_PATH/terminal/tmux/.tmux.conf" "$HOME/.tmux.conf"

if [ -f "$DOTFILES_PATH/local/gitconfig" ]; then
  ln -s -i "$DOTFILES_PATH/local/gitconfig" "$HOME/.gitconfig.local"
fi

# Change default terminal to ZSH
chsh -s "$(command -v zsh)"

# Install zimfw
curl -fsSL https://raw.githubusercontent.com/zimfw/install/master/install.zsh | zsh
