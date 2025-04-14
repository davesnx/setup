#! /usr/bin/env bash

export PYTHON_PATH='/usr/local/opt/python'
export RUBY_PATH='/usr/local/opt/ruby'
export BUN_INSTALL="$HOME/.bun"
export GEM_HOME="$HOME/.gem"

JAVA_HOME=$(/usr/libexec/java_home -v 11)
export JAVA_HOME

export FZF_DEFAULT_OPTS="--color=bg+:24 --reverse --height 40% --history=$HOME/.fzf_history"
export FORGIT_LOG_FZF_OPTS="--no-height"
export FZF_COMPLETION_OPTS='+c -x'

export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH=${DOTFILES_PATH}/brew/Brewfile

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

export EDITOR="cursor"
export VISUAL="cursor"

# Enable persistent REPL history for `node`.
export NODE_REPL_HISTORY=~/.node_history
# Allow 32³ entries; the default is 1000.
export NODE_REPL_HISTORY_SIZE='32768'
# Use sloppy mode by default, matching web browsers.
export NODE_REPL_MODE='sloppy'
# fnm doesn't set this, so we do it here
# WHICH_NODE=$(which node)
# export NODE_BIN_PATH=$WHICH_NODE

export BIOME_CONFIG_PATH="${DOTFILES_PATH}/editors/biome.json"

# Increase Bash history size. Allow 32³ entries; the default is 500.
export HISTSIZE='32768'
export HISTFILESIZE="${HISTSIZE}"
# Omit duplicates and commands that begin with a space from history.
export HISTCONTROL='ignoreboth'

# Highlight section titles in manual pages.
export LESS_TERMCAP_md=${yellow}

# Don’t clear the screen after quitting a manual page.
export MANPAGER='less -X';

# dream > conf-libssl > openssl
export LDFLAGS="-L/usr/local/opt/openssl@3/lib"
export CPPFLAGS="-I/usr/local/opt/openssl@3/include"
export PKG_CONFIG_PATH="/usr/local/opt/openssl@3/lib/pkgconfig"

# allow substitution in PS1
setopt promptsubst
