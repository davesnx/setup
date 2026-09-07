#! /bin/zsh

# Language toolchain paths
export GEM_HOME="$HOME/.gem"
export BUN_INSTALL="$HOME/.bun"

[[ "$OSTYPE" == darwin* ]] && source "$DOTFILES_PATH/mac/main.sh"

# PATH setup
paths=(
  "$HOME/bin"
  "$HOME/.local/bin"
  "$HOME/.npm/node_modules/bin"
  "$HOME/.deno/bin"
  "$HOME/.cargo/bin"
  "$BUN_INSTALL/bin"
  "$GEM_HOME/bin"
  "$HOME/.elan/bin"
  "$HOME/.opencode/bin"
  "/opt/homebrew/bin"
  "/opt/homebrew/sbin"
  "/usr/local/bin"
  "/usr/local/sbin"
  "/usr/bin"
  "/usr/sbin"
  "/bin"
  "/sbin"
)
export PATH="${(j.:.)paths}"

# Each folder prepends its own PATH entries; enpass sources after terminal/bin
# so it stays ahead, matching the order this array used to declare.
source "$DOTFILES_PATH/terminal/bin/main.sh"
source "$DOTFILES_PATH/mac/enpass/main.sh"
source "$DOTFILES_PATH/terminal/opencode/main.sh"

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
if (( ${+commands[cursor]} )); then
  export EDITOR="cursor"
else
  export EDITOR="vim"
fi
export VISUAL="$EDITOR"

export NODE_REPL_HISTORY=~/.node_history
export NODE_REPL_HISTORY_SIZE='32768'
export NODE_REPL_MODE='sloppy'

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  export BROWSER="xdg-open"
  export GH_BROWSER="xdg-open"
fi

# OrbStack adds its CLI tools and completions from this file when installed.
[[ -r "$HOME/.orbstack/shell/init.zsh" ]] && source "$HOME/.orbstack/shell/init.zsh"
