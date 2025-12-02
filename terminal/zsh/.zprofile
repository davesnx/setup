#! /bin/zsh
# .zprofile - runs once per login session (not every subshell)

export DOTFILES_PATH="$HOME/Code/github/setup"

# Language toolchain paths
export PYTHON_PATH='/usr/local/opt/python'
export RUBY_PATH='/usr/local/opt/ruby'
export GEM_HOME="$HOME/.gem"
export BUN_INSTALL="$HOME/.bun"

# PATH setup
my_paths=(
  # User-specific paths
  "$HOME/bin"
  "$HOME/.local/bin" # dune, pipx, etc.
  "$HOME/.deno/bin" # deno
  "$HOME/.cargo/bin" # rust
  "$BUN_INSTALL/bin" # bun
  "$GEM_HOME/bin" # ruby
  "$HOME/.elan/bin" # lean

  # Dotfiles scripts
  "$DOTFILES_PATH/terminal/bin"
  "$DOTFILES_PATH/terminal/bin/git-extras"
  "$DOTFILES_PATH/terminal/bin/ocaml"
  "$DOTFILES_PATH/terminal/bin/fs"

  # Homebrew
  "/opt/homebrew/bin"
  "/opt/homebrew/sbin"

  # System paths
  "/usr/local/bin"
  "/usr/local/sbin"
  "/usr/bin"
  "/usr/sbin"
  "/bin"
  "/sbin"
)
export PATH="${(j.:.)my_paths}"

# Homebrew config
export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH=${DOTFILES_PATH}/mac/brew/Brewfile

# Locale
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

# Editor
export EDITOR="cursor"
export VISUAL="cursor"

# less/man
export LESS_TERMCAP_md=${yellow} # Highlight section titles in manual pages.
export MANPAGER='less -X' # Don't clear the screen after quitting a manual page.

# Build flags (for OCaml, native deps, etc.)
export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/opt/openssl@3/lib/pkgconfig:$PKG_CONFIG_PATH"
export LIBRARY_PATH="/opt/homebrew/lib:$LIBRARY_PATH"
export C_INCLUDE_PATH="/opt/homebrew/include:$C_INCLUDE_PATH"

# Node REPL
export NODE_REPL_HISTORY=~/.node_history
export NODE_REPL_HISTORY_SIZE='32768'
export NODE_REPL_MODE='sloppy'

# FZF
export FZF_DEFAULT_OPTS="--color=bg+:24 --reverse --height 40% --history=$HOME/.fzf_history"
export FORGIT_LOG_FZF_OPTS="--no-height"
export FZF_COMPLETION_OPTS='+c -x'
