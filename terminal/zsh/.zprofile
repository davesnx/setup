#! /bin/zsh

export GEM_HOME="$HOME/.gem"
export BUN_INSTALL="$HOME/.bun"

[[ "$OSTYPE" == darwin* ]] && source "$DOTFILES_PATH/mac/main.sh"

export OPENCODE_ENABLE_EXA=1

# Load the selected OpenCode host profile when it is installed.
if [[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/opencode/host.jsonc" ]]; then
  export OPENCODE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/host.jsonc"
fi

# PATH setup
paths=(
  "$DOTFILES_PATH/mac/enpass/bin"
  "$DOTFILES_PATH/terminal/bin"
  "$DOTFILES_PATH/terminal/bin/ocs"
  "$DOTFILES_PATH/terminal/bin/git-extras"
  "$DOTFILES_PATH/terminal/bin/ocaml"
  "$DOTFILES_PATH/terminal/bin/fs"
  "$HOME/bin"
  "$HOME/.local/bin"
  "$HOME/.local/share/node-tools/node_modules/.bin"
  "$HOME/.deno/bin"
  "$HOME/.cargo/bin"
  "$HOME/.bend/bin"
  "$BUN_INSTALL/bin"
  "$GEM_HOME/bin"
  "$HOME/.elan/bin"
  "$HOME/.opencode/bin"
  ${HOMEBREW_PREFIX:+"$HOMEBREW_PREFIX/bin"}
  ${HOMEBREW_PREFIX:+"$HOMEBREW_PREFIX/sbin"}
  "/usr/local/bin"
  "/usr/local/sbin"
  "/usr/bin"
  "/usr/sbin"
  "/bin"
  "/sbin"
)
path=("${(@u)paths}")
export PATH

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

# OrbStack adds its CLI tools and completions from this file when installed.
[[ -r "$HOME/.orbstack/shell/init.zsh" ]] && source "$HOME/.orbstack/shell/init.zsh"
