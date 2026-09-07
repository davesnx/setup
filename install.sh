#! /usr/bin/env sh

set -eu

setup_path="$(CDPATH='' cd "$(dirname "$0")" && pwd)"

if [ ! -f "$setup_path/mac/brew/Brewfile" ]; then
  echo "Invalid setup path: $setup_path" >&2
  exit 66
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

zsh_path=$(command -v zsh 2>/dev/null) || {
  echo "zsh is required." >&2
  exit 69
}

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 69
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install the eval harness and Claude hooks." >&2
  exit 69
fi

echo "👉 dotfiles path: '$setup_path'"

if [ "$(uname -s)" = Darwin ]; then
  echo ""
  echo "Installing custom packages"
  echo ""
  sh "$setup_path/mac/install.sh" "$setup_path"
fi

# Zsh
ln -s -i "$setup_path/terminal/zsh/.zshenv" "$HOME/.zshenv"
ln -s -i "$setup_path/terminal/zsh/.zshrc" "$HOME/.zshrc"
ln -s -i "$setup_path/terminal/zsh/.zprofile" "$HOME/.zprofile"
ln -s -i "$setup_path/terminal/zsh/.zimrc" "$HOME/.zimrc"

# Git
ln -s -i "$setup_path/git/.gitconfig" "$HOME/.gitconfig"
ln -s -i "$setup_path/git/.gitignore_global" "$HOME/.gitignore_global"
ln -s -i "$setup_path/git/.gitattributes" "$HOME/.gitattributes"

# Claude Code
mkdir -p "$HOME/.claude"
ln -s -i "$setup_path/terminal/claude/settings.json" "$HOME/.claude/settings.json"
ln -s -i "$setup_path/terminal/claude/settings.local.json" "$HOME/.claude/settings.local.json"
ln -s -i "$setup_path/terminal/claude/statusline.ts" "$HOME/.claude/statusline.ts"
# Puppet installs the real dcg wrapper at this path on nspawn; link the no-op
# stand-in only where nothing is there yet. -f also replaces a stand-in link
# left dangling by the move from .claude/ to terminal/claude/, which -e misses.
mkdir -p "$HOME/.claude/hooks"
if [ ! -e "$HOME/.claude/hooks/dcg" ]; then
  ln -sfn "$setup_path/terminal/claude/hooks/dcg" "$HOME/.claude/hooks/dcg"
fi

auto_improve_hook="$HOME/.claude/hooks/auto-improve.ts"
auto_improve_source="$setup_path/terminal/claude/hooks/auto-improve.ts"
if [ -L "$auto_improve_hook" ] && [ "$(readlink "$auto_improve_hook")" = "$auto_improve_source" ]; then
  :
elif [ -e "$auto_improve_hook" ] || [ -L "$auto_improve_hook" ]; then
  echo "Cannot replace existing Claude auto-improve hook: $auto_improve_hook" >&2
  exit 73
fi

npm ci --prefix "$setup_path/terminal/claude/hooks" --omit=dev --no-audit --no-fund

if [ ! -L "$auto_improve_hook" ]; then
  ln -s "$auto_improve_source" "$auto_improve_hook"
fi

old_auto_improve_hook="$HOME/.claude/hooks/auto-improve.py"
if [ -L "$old_auto_improve_hook" ] && [ "$(readlink "$old_auto_improve_hook")" = "$setup_path/terminal/claude/hooks/auto-improve.py" ]; then
  rm "$old_auto_improve_hook"
fi

# Tmux
ln -s -i "$setup_path/terminal/tmux/.tmux.conf" "$HOME/.tmux.conf"
# The config loads this status line plugin at startup and errors without it.
if [ ! -d "$HOME/.tmux/plugins/tmux-nova" ]; then
  git clone --depth 1 https://github.com/o0th/tmux-nova.git "$HOME/.tmux/plugins/tmux-nova"
fi

# htop
mkdir -p "$HOME/.config/htop"
ln -s -i "$setup_path/terminal/htop/htoprc" "$HOME/.config/htop/htoprc"

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
chsh -s "$zsh_path"

# OpenCode, Claude Code, and shared agent skills (profile auto-detected).
sh "$setup_path/terminal/opencode/install.sh"

sh "$setup_path/terminal/bin/eval-harness/install.sh"

# Install zimfw without generating shell configuration.
mkdir -p "$HOME/.zim"
zimfw_download=$(mktemp "$HOME/.zim/zimfw.zsh.XXXXXX")
trap 'rm -f "$zimfw_download"' EXIT HUP INT TERM
curl -fsSL -o "$zimfw_download" https://github.com/zimfw/zimfw/releases/latest/download/zimfw.zsh
"$zsh_path" -n "$zimfw_download"
mv "$zimfw_download" "$HOME/.zim/zimfw.zsh"
trap - EXIT HUP INT TERM
"$zsh_path" -c "source \"\$ZIM_HOME/zimfw.zsh\" init -q"
