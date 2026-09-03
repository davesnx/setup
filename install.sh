#! /usr/bin/env sh

setup_path="$(CDPATH='' cd "$(dirname "$0")" && pwd)"

echo "👉 dotfiles path: '$setup_path'"

echo ""
echo "Installing custom packages"
echo ""

sh "$setup_path/mac/install.sh" "$setup_path"

# Zsh
ln -s -i "$setup_path/terminal/zsh/.zshenv" "$HOME/.zshenv"
ln -s -i "$setup_path/terminal/zsh/.zshrc" "$HOME/.zshrc"
ln -s -i "$setup_path/terminal/zsh/.zprofile" "$HOME/.zprofile"
ln -s -i "$setup_path/terminal/zsh/.zimrc" "$HOME/.zimrc"
ln -s -i "$setup_path/terminal/zsh/.zlogin" "$HOME/.zlogin"

# Git
ln -s -i "$setup_path/git/.gitconfig" "$HOME/.gitconfig"
ln -s -i "$setup_path/git/.gitignore_global" "$HOME/.gitignore_global"
ln -s -i "$setup_path/git/.gitattributes" "$HOME/.gitattributes"

# Claude Code
mkdir -p "$HOME/.claude"
ln -s -i "$setup_path/.claude/settings.json" "$HOME/.claude/settings.json"
ln -s -i "$setup_path/.claude/settings.local.json" "$HOME/.claude/settings.local.json"
ln -s -i "$setup_path/skills" "$HOME/.claude/skills"

# Tmux
ln -s -i "$setup_path/terminal/tmux/.tmux.conf" "$HOME/.tmux.conf"

# SSH
ssh_config_dir="$HOME/.ssh/config.d"
ssh_opener_config="$ssh_config_dir/xdg-open.conf"
mkdir -p "$ssh_config_dir"
chmod 700 "$HOME/.ssh" "$ssh_config_dir"

if [ -e "$ssh_opener_config" ] && [ ! -L "$ssh_opener_config" ]; then
  echo "Cannot replace SSH config file: $ssh_opener_config" >&2
  exit 73
fi
ln -sfn "$setup_path/ssh/xdg-open.conf" "$ssh_opener_config"

ssh_config="$HOME/.ssh/config"
if [ ! -e "$ssh_config" ]; then
  (umask 077 && : >"$ssh_config")
fi
if ! grep -Eq '^[[:space:]]*Include[[:space:]]+(~/.ssh/)?config\.d/\*[[:space:]]*$' "$ssh_config"; then
  printf '\nInclude config.d/*\n' >>"$ssh_config"
fi

if [ -f "$setup_path/local/gitconfig" ]; then
  ln -s -i "$setup_path/local/gitconfig" "$HOME/.gitconfig.local"
fi

# Change default terminal to ZSH
chsh -s "$(command -v zsh)"

# Install zimfw without generating shell configuration.
mkdir -p "$HOME/.zim"
curl -fsSL -o "$HOME/.zim/zimfw.zsh" https://github.com/zimfw/zimfw/releases/latest/download/zimfw.zsh
zsh -c 'source "$ZIM_HOME/zimfw.zsh" init -q'
