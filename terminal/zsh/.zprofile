#! /bin/zsh

export DOTFILES_PATH="${DOTFILES_PATH:-${${:-$HOME/.zprofile}:A:h:h:h}}"

# Language toolchain paths
export PYTHON_PATH='/usr/local/opt/python'
export RUBY_PATH='/usr/local/opt/ruby'
export GEM_HOME="$HOME/.gem"
export BUN_INSTALL="$HOME/.bun"

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

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
  "$DOTFILES_PATH/terminal/bin"
  "$DOTFILES_PATH/terminal/bin/git-extras"
  "$DOTFILES_PATH/terminal/bin/ocaml"
  "$DOTFILES_PATH/terminal/bin/fs"
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

# Homebrew config
export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH="$DOTFILES_PATH/mac/brew/Brewfile"

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
export EDITOR="cursor"
export VISUAL="cursor"

export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/opt/openssl@3/lib/pkgconfig:$PKG_CONFIG_PATH"
export LIBRARY_PATH="/opt/homebrew/opt/libev/lib:/opt/homebrew/lib:$LIBRARY_PATH"
export C_INCLUDE_PATH="/opt/homebrew/include:$C_INCLUDE_PATH"

export NODE_REPL_HISTORY=~/.node_history
export NODE_REPL_HISTORY_SIZE='32768'
export NODE_REPL_MODE='sloppy'

export OPENCODE_ENABLE_EXA=1

# Load the selected OpenCode host profile when it is installed.
if [[ -f "$HOME/.config/opencode/host.jsonc" ]]; then
  export OPENCODE_CONFIG="$HOME/.config/opencode/host.jsonc"
fi
