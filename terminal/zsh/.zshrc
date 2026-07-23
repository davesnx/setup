#! /bin/zsh

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

# less/man
export LESS_TERMCAP_md=${yellow} # Highlight section titles in manual pages.
export MANPAGER='less -X' # Don't clear the screen after quitting a manual page.

# Build flags (for OCaml, native deps, etc.)
export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/opt/openssl@3/lib/pkgconfig:$PKG_CONFIG_PATH"
export LIBRARY_PATH="/opt/homebrew/lib:$LIBRARY_PATH"
export LIBRARY_PATH="/opt/homebrew/opt/libev/lib:$LIBRARY_PATH"
export C_INCLUDE_PATH="/opt/homebrew/include:$C_INCLUDE_PATH"

# Node REPL
export NODE_REPL_HISTORY=~/.node_history
export NODE_REPL_HISTORY_SIZE='32768'
export NODE_REPL_MODE='sloppy'

# FZF
export FZF_DEFAULT_OPTS="--color=bg+:24 --reverse --height 40% --history=$HOME/.fzf_history"
export FORGIT_LOG_FZF_OPTS="--no-height"
export FZF_COMPLETION_OPTS='+c -x'

# (Instant prompt) Must be at the very top before any other output
[[ -r "$DOTFILES_PATH/terminal/zsh/instant-prompt.zsh" ]] && source "$DOTFILES_PATH/terminal/zsh/instant-prompt.zsh"

# History
setopt HIST_IGNORE_ALL_DUPS # Remove older command from the history if a duplicate is to be added.
setopt HIST_REDUCE_BLANKS # Remove superfluous blanks before recording entry.
setopt hist_ignore_space # ignore commands that start with space
setopt HIST_IGNORE_DUPS # Don't record an entry that was just recorded again.
HISTFILE=~/.zhistory
export HISTSIZE='32768'
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

fpath=(/${ZDOTDIR:-${DOTFILES_PATH}}/terminal/zsh/themes $fpath)
autoload -Uz promptinit && promptinit

prompt davesnx

# zsh options
setopt autopushd # Automatically adds directories to the directory stack when you use cd
unsetopt cdablevars # Disables the ability to use variable names as directory shortcuts with cd
setopt promptsubst # allow substitution in PS1

# GPG
export GPG_TTY=$(tty)

# Editor
export EDITOR="cursor"
export VISUAL="cursor"

# register all aliases
source "$DOTFILES_PATH/terminal/_aliases/alias.sh"
source "$DOTFILES_PATH/terminal/_aliases/fp.sh"
source "$DOTFILES_PATH/terminal/_aliases/git.sh"
source "$DOTFILES_PATH/terminal/_aliases/func.sh"

# Add SSH identities (background job)
{
  ssh-add --apple-use-keychain ~/.ssh/id     &> /dev/null
  ssh-add --apple-use-keychain ~/.ssh/id_rsa &> /dev/null
} &!

# Initialize zsh-defer
autoload -Uz ${ZIM_HOME}/modules/zsh-defer/zsh-defer

# Refresh native wordcode after edits; Zsh ignores it whenever the source is newer.
_zshrc_source="$DOTFILES_PATH/terminal/zsh/.zshrc"
[[ "$_zshrc_source.zwc" -nt "$_zshrc_source" ]] || zsh-defer zcompile "$_zshrc_source"
unset _zshrc_source

# Load autosuggestions (deferred for faster startup)
zsh-defer source ~/.zim/modules/zsh-autosuggestions/zsh-autosuggestions.zsh

# Homebrew env vars (HOMEBREW_PREFIX, MANPATH, etc.)
if [[ -n "$CURSOR_AGENT" ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
else
  zsh-defer _evalcache /opt/homebrew/bin/brew shellenv
fi

# Load zoxide
if [[ -n "$CURSOR_AGENT" ]]; then
  eval "$(zoxide init zsh)"
else
  zsh-defer _evalcache zoxide init zsh
fi

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # match upper from lower case

# Load forgit
zsh-defer source "$DOTFILES_PATH/git/forgit.zsh"

# Load fzf-keybindings
zsh-defer source "$DOTFILES_PATH/terminal/zsh/fzf-key-bindings.zsh"

# Load opam
zsh-defer source "$DOTFILES_PATH/terminal/opam-init/init.zsh"

# Load direnv
eval "$(direnv hook zsh)"

# Load fnm
_fnm_post_direnv_hook() {
  if command -v fnm &>/dev/null && [[ -f .node-version || -f .nvmrc ]]; then
    eval "$(fnm env --shell zsh)"
    fnm use --silent-if-unchanged
  fi
}
add-zsh-hook chpwd _fnm_post_direnv_hook

zmodload zsh/datetime
zmodload -F zsh/files b:zf_ln
export FNM_DIR="$HOME/.fnm"
export FNM_MULTISHELL_PATH="$HOME/.local/state/fnm_multishells/${$}_${EPOCHREALTIME//./}"
export FNM_VERSION_FILE_STRATEGY="local"
export FNM_LOGLEVEL="info"
export FNM_NODE_DIST_MIRROR="https://nodejs.org/dist"
export FNM_COREPACK_ENABLED="false"
export FNM_RESOLVE_ENGINES="true"
export FNM_ARCH="arm64"
zf_ln -s "$FNM_DIR/aliases/default" "$FNM_MULTISHELL_PATH"
export PATH="$FNM_MULTISHELL_PATH/bin:$PATH"
rehash
zmodload -u zsh/files zsh/datetime

# Load opam local switch
_opam_local_switch_hook() {
  if [[ -d "_opam" ]]; then
    eval "$(opam env)"
  fi
}
add-zsh-hook chpwd _opam_local_switch_hook

# Initialize opam env if starting in a directory with local switch
if [[ -d "_opam" ]]; then
  if [[ -n "$CURSOR_AGENT" ]]; then
    eval "$(opam env)"
  else
    zsh-defer _evalcache opam env
  fi
fi

# Load dune autocompletions
compopt() { return 0; } # disable compopt since dune/env use bash compat with zsh
zsh-defer source $HOME/.local/share/dune/env/env.zsh
