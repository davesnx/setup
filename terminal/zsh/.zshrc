#! /bin/zsh

# DOTFILES_PATH is set in .zprofile, but fallback for non-login shells
export DOTFILES_PATH=${DOTFILES_PATH:-$HOME/Code/github/setup}

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

# GPG (must be in .zshrc - tty changes per terminal)
export GPG_TTY=$(tty)

# Register all aliases
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

# Load autosuggestions (deferred for faster startup)
zsh-defer source ~/.zim/modules/zsh-autosuggestions/zsh-autosuggestions.zsh

# Homebrew env vars (HOMEBREW_PREFIX, MANPATH, etc.)
zsh-defer _evalcache /opt/homebrew/bin/brew shellenv

# Load zoxide
zsh-defer _evalcache zoxide init zsh

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # match upper from lower case

# Load forgit
zsh-defer source "$DOTFILES_PATH/git/forgit.zsh"

# Load fzf-keybindings
zsh-defer source "$DOTFILES_PATH/terminal/zsh/fzf-key-bindings.zsh"

# Load direnv
if [[ -n "$CURSOR_AGENT" ]]; then
  eval "$(direnv hook zsh)"
else
  zsh-defer _evalcache direnv hook zsh
fi

# Load fnm
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

# Load opam
if [[ -n "$CURSOR_AGENT" ]]; then
  source "$DOTFILES_PATH/terminal/opam-init/init.zsh"
  eval "$(opam env)"
else
  zsh-defer source "$DOTFILES_PATH/terminal/opam-init/init.zsh"
  zsh-defer _evalcache opam env
fi

# Load dune autocompletions
compopt() { return 0; } # disable compopt since dune/env use bash compat with zsh
zsh-defer source $HOME/.local/share/dune/env/env.zsh
