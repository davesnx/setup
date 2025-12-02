#! /bin/zsh

# History
setopt HIST_IGNORE_ALL_DUPS # Remove older command from the history if a duplicate is to be added.
setopt HIST_REDUCE_BLANKS # Remove superfluous blanks before recording entry.
setopt hist_ignore_space # ignore commands that start with space
setopt HIST_IGNORE_DUPS # Don't record an entry that was just recorded again.
HISTFILE=~/.zhistory
export HISTSIZE='32768' # Increase Bash history size. Allow 32³ entries
SAVEHIST=$HISTSIZE
bindkey -e # Set editor default keymap to emacs (`-e`) or vi (`-v`)

setopt CORRECT # Prompt for spelling correction of commands.

# Remove path separator from WORDCHARS.
WORDCHARS=""

# Better globbing
setopt EXTENDED_GLOB    # Enables ^, ~, # in patterns (e.g., ls ^*.txt)

# Completion behavior
setopt COMPLETE_IN_WORD # Tab completes from cursor position, not just end
setopt ALWAYS_TO_END    # Move cursor to end after completion

# completion
zstyle ':zim:termtitle' format '%1~'

# zsh-syntax-highlighting
# https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/docs/highlighters.md
ZSH_HIGHLIGHT_HIGHLIGHTERS=(main brackets)

if [[ ! ${ZIM_HOME}/init.zsh -nt ${ZDOTDIR:-${HOME}}/.zimrc ]]; then
  # Update static initialization script if it does not exist or it's outdated, before sourcing it
  source ${ZIM_HOME}/zimfw.zsh init -q
fi

source ${ZIM_HOME}/init.zsh

# ------------------------------
# Post-init module configuration
# ------------------------------

# zsh-history-substring-search

autoload -U history-substring-search-up history-substring-search-down

# Bind ^[[A/^[[B manually so up/down works both before and after zle-line-init
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# Bind up and down keys
zmodload -F zsh/terminfo +p:terminfo
if [[ -n ${terminfo[kcuu1]} && -n ${terminfo[kcud1]} ]]; then
  bindkey ${terminfo[kcuu1]} history-substring-search-up
  bindkey ${terminfo[kcud1]} history-substring-search-down
fi

bindkey -M vicmd 'k' history-substring-search-up
bindkey -M vicmd 'j' history-substring-search-down

export DOTFILES_PATH=$HOME/Code/github/setup

fpath=(/${ZDOTDIR:-${DOTFILES_PATH}}/terminal/zsh/themes $fpath)
autoload -Uz promptinit && promptinit

prompt davesnx

# zsh options
setopt autopushd # Automatically adds directories to the directory stack when you use cd
unsetopt cdablevars # Disables the ability to use variable names as directory shortcuts with cd
setopt promptsubst # allow substitution in PS1

export GPG_TTY=$(tty)

export PYTHON_PATH='/usr/local/opt/python'
export RUBY_PATH='/usr/local/opt/ruby'
export GEM_HOME="$HOME/.gem"
export BUN_INSTALL="$HOME/.bun"

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
  "$DOTFILES_PATH/bin"
  "$DOTFILES_PATH/bin/git-extras"
  "$DOTFILES_PATH/bin/ocaml"
  "$DOTFILES_PATH/bin/fs"

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

# Register all aliases (direct sourcing avoids glob expansion overhead)
source "$DOTFILES_PATH/terminal/_aliases/alias.sh"
source "$DOTFILES_PATH/terminal/_aliases/fp.sh"
source "$DOTFILES_PATH/terminal/_aliases/git.sh"
source "$DOTFILES_PATH/terminal/_aliases/func.sh"

export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH=${DOTFILES_PATH}/mac/brew/Brewfile

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

export EDITOR="cursor"
export VISUAL="cursor"

export LESS_TERMCAP_md=${yellow} # Highlight section titles in manual pages.
export MANPAGER='less -X'; # Don’t clear the screen after quitting a manual page.

# Homebrew & OpenSSL paths for native dependencies (OCaml, etc.)
# export LDFLAGS="-L/usr/local/opt/openssl@3/lib"
# export CPPFLAGS="-I/usr/local/opt/openssl@3/include"

export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include"

export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/opt/openssl@3/lib/pkgconfig:$PKG_CONFIG_PATH"
export LIBRARY_PATH="/opt/homebrew/lib:$LIBRARY_PATH"
export C_INCLUDE_PATH="/opt/homebrew/include:$C_INCLUDE_PATH"


# Add identities to sshrm
{
  ssh-add --apple-use-keychain ~/.ssh/id     &> /dev/null
  ssh-add --apple-use-keychain ~/.ssh/id_rsa &> /dev/null
} &!

# Initialize zsh-defer
autoload -Uz ${ZIM_HOME}/modules/zsh-defer/zsh-defer

# Homebrew env vars (HOMEBREW_PREFIX, MANPATH, etc.)
zsh-defer _evalcache /opt/homebrew/bin/brew shellenv

# Load zoxide
zsh-defer _evalcache zoxide init zsh

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # match upper from lower case

ulimit -n 2048

# Load forgit
zsh-defer source "$DOTFILES_PATH/git/forgit.zsh"

# Load fzf-keybindings
zsh-defer source "$DOTFILES_PATH/terminal/zsh/fzf-key-bindings.zsh"
export FZF_DEFAULT_OPTS="--color=bg+:24 --reverse --height 40% --history=$HOME/.fzf_history"
export FORGIT_LOG_FZF_OPTS="--no-height"
export FZF_COMPLETION_OPTS='+c -x'

# Load direnv
# eval "$(direnv hook zsh)"
if [[ -n "$CURSOR_AGENT" ]]; then
  eval "$(direnv hook zsh)"
else
  zsh-defer _evalcache direnv hook zsh
fi

# Load fnm (without --use-on-cd, we handle that ourselves below)
# Re-add fnm to PATH after direnv runs (direnv's opam env can remove it)
# Hook is registered AFTER direnv's hook, so it runs last on chpwd
_fnm_post_direnv_hook() {
  if command -v fnm &>/dev/null && [[ -f .node-version || -f .nvmrc ]]; then
    eval "$(fnm env --shell zsh)"
    fnm use --silent-if-unchanged
  fi
}
_setup_fnm() {
  if command -v fnm &>/dev/null; then
    eval "$(fnm env --shell zsh)"
    add-zsh-hook chpwd _fnm_post_direnv_hook
  fi
}
if [[ -n "$CURSOR_AGENT" ]]; then
  _setup_fnm
else
  zsh-defer _setup_fnm
fi

export NODE_REPL_HISTORY=~/.node_history # Enable persistent REPL history for `node`.
export NODE_REPL_HISTORY_SIZE='32768' # Allow 32³ entries; the default is 1000.
export NODE_REPL_MODE='sloppy' # Use sloppy mode by default, matching web browsers.

# opam-zsh autocompletion (using version from dotfiles, not ~/.opam/opam-init)
# load opam
# eval "$(opam env)"
if [[ -n "$CURSOR_AGENT" ]]; then
  source "$DOTFILES_PATH/terminal/opam-init/init.zsh"
  eval "$(opam env)"
else
  zsh-defer source "$DOTFILES_PATH/terminal/opam-init/init.zsh"
  zsh-defer _evalcache opam env
fi

# load dune autocompletions
compopt() { return 0; } # disable compopt since dune/env use bash compt with zsh
zsh-defer source $HOME/.local/share/dune/env/env.zsh

# load Alice env
# zsh-defer source "$HOME/.alice/env/env.zsh"
