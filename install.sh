#! /usr/bin/env sh

DOTFILES_PATH="$(CDPATH='' cd "$(dirname "$0")" && pwd)"
export DOTFILES_PATH

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

# SSH
ssh_config_dir="$HOME/.ssh/config.d"
ssh_opener_config="$ssh_config_dir/xdg-open.conf"
mkdir -p "$ssh_config_dir"
chmod 700 "$HOME/.ssh" "$ssh_config_dir"

if [ -e "$ssh_opener_config" ] && [ ! -L "$ssh_opener_config" ]; then
  echo "Cannot replace SSH config file: $ssh_opener_config" >&2
  exit 73
fi
ln -sfn "$DOTFILES_PATH/ssh/xdg-open.conf" "$ssh_opener_config"

ssh_config="$HOME/.ssh/config"
if [ ! -e "$ssh_config" ]; then
  (umask 077 && : >"$ssh_config")
fi
if ! grep -Eq '^[[:space:]]*Include[[:space:]]+(~/.ssh/)?config\.d/\*[[:space:]]*$' "$ssh_config"; then
  printf '\nInclude config.d/*\n' >>"$ssh_config"
fi

if [ -f "$DOTFILES_PATH/local/gitconfig" ]; then
  ln -s -i "$DOTFILES_PATH/local/gitconfig" "$HOME/.gitconfig.local"
fi

# Change default terminal to ZSH
chsh -s "$(command -v zsh)"

# Install zimfw
curl -fsSL https://raw.githubusercontent.com/zimfw/install/master/install.zsh | zsh
