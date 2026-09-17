#! /bin/zsh

# (Instant prompt) Must be at the very top before any other output
[[ -r "$DOTFILES_PATH/terminal/zsh/instant-prompt.zsh" ]] && source "$DOTFILES_PATH/terminal/zsh/instant-prompt.zsh"

# History
setopt HIST_IGNORE_ALL_DUPS # Remove older command from the history if a duplicate is to be added.
setopt HIST_REDUCE_BLANKS # Remove superfluous blanks before recording entry.
setopt hist_ignore_space # ignore commands that start with space
setopt HIST_IGNORE_DUPS # Don't record an entry that was just recorded again.
bindkey -e # Set editor default keymap to emacs (`-e`) or vi (`-v`)

setopt nonomatch
setopt CORRECT # Prompt for spelling correction of commands.

# .zshenv skips macOS /etc/zshrc. These are its two settings that nothing here replaces.
setopt COMBINING_CHARS
disable log

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

# Inherited duplicate completion paths can invalidate Zim cache.
typeset -U fpath
if [[ ! ${ZIM_HOME}/init.zsh -nt ${ZDOTDIR:-${HOME}}/.zimrc ]]; then
  # Update static initialization script if it does not exist or it's outdated, before sourcing it
  source ${ZIM_HOME}/zimfw.zsh init -q
fi

source ${ZIM_HOME}/init.zsh
source "$DOTFILES_PATH/terminal/zsh/completion.zsh"

# The zim environment module sets HISTSIZE and SAVEHIST, so these must come
# after init.zsh to take effect.
HISTFILE=~/.zhistory
export HISTSIZE='32768'
SAVEHIST=$HISTSIZE

export LESS_TERMCAP_md=${yellow}
export MANPAGER='less -X'
export FZF_DEFAULT_OPTS="--color=bg+:24 --reverse --height 40% --history=$HOME/.fzf_history"
export FORGIT_LOG_FZF_OPTS="--no-height"
export FZF_COMPLETION_OPTS='+c -x'

# ------------------------------
# Post-init module configuration
# ------------------------------

source "$DOTFILES_PATH/terminal/zsh/selection.zsh"

# zsh-history-substring-search
# Bind ^[[A/^[[B manually so up/down works both before and after zle-line-init
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down
bindkey '^P' history-substring-search-up
bindkey '^N' history-substring-search-down

# Option+Up/Down send modified arrow sequences.
bindkey '^[[1;3A' history-substring-search-up
bindkey '^[[1;3B' history-substring-search-down

# Bind up and down keys
zmodload -F zsh/terminfo +p:terminfo
if [[ -n ${terminfo[kcuu1]} && -n ${terminfo[kcud1]} ]]; then
  bindkey ${terminfo[kcuu1]} history-substring-search-up
  bindkey ${terminfo[kcud1]} history-substring-search-down
fi

bindkey -M vicmd 'k' history-substring-search-up
bindkey -M vicmd 'j' history-substring-search-down

source "$DOTFILES_PATH/terminal/zsh/themes/prompt_davesnx_setup"

# zsh options
setopt autopushd # Automatically adds directories to the directory stack when you use cd
unsetopt cdablevars # Disables the ability to use variable names as directory shortcuts with cd
setopt promptsubst # allow substitution in PS1

# GPG
export GPG_TTY=/dev/tty

source "$DOTFILES_PATH/terminal/_aliases/main.sh"
source "$DOTFILES_PATH/terminal/node/npm.zsh"
source "$DOTFILES_PATH/agents/main.sh"

# Initialize zsh-defer
autoload -Uz ${ZIM_HOME}/modules/zsh-defer/zsh-defer

# Syntax highlighting and history search wrap widgets, so they can load after
# the first prompt. .zimrc installs them with -d, like autosuggestions.
zsh-defer source ${ZIM_HOME}/modules/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
zsh-defer source ${ZIM_HOME}/modules/zsh-history-substring-search/zsh-history-substring-search.zsh

# Load autosuggestions (deferred for faster startup)
zsh-defer source ~/.zim/modules/zsh-autosuggestions/zsh-autosuggestions.zsh

source "$DOTFILES_PATH/terminal/zsh/cached-init.zsh"
_cached_init zoxide init zsh

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # match upper from lower case

source "$DOTFILES_PATH/git/main.sh"

# Load fzf-keybindings
zsh-defer source "$DOTFILES_PATH/terminal/zsh/fzf-key-bindings.zsh"

# fnm before direnv: direnv restores the PATH it recorded when a project
# loaded, so Node must already be on it. `fnm use` repoints a symlink and never
# edits PATH, so nothing has to run after direnv.
if (( ${+commands[fnm]} )); then
  eval "$(fnm env --use-on-cd --shell zsh)"
fi
_cached_init direnv hook zsh

# Load opam and switch automatically when entering or leaving a local switch.
_opam_local_switch_hook() {
  (( ${+commands[opam]} )) || return

  local switch_root="$PWD"
  while [[ "$switch_root" != "/" && ! -d "$switch_root/_opam" ]]; do
    switch_root="${switch_root:h}"
  done

  local target="$_OPAM_DEFAULT_SWITCH"
  [[ -d "$switch_root/_opam" ]] && target="$switch_root"

  [[ ${+_OPAM_ACTIVE_SWITCH} == 1 && "$target" == "$_OPAM_ACTIVE_SWITCH" ]] && return

  local opam_env
  if [[ -n "$target" ]]; then
    opam_env="$(opam env --shell=zsh --readonly --inplace-path --switch="$target" --set-switch)" || return
  else
    opam_env="$(opam env --shell=zsh --readonly --revert)" || return
  fi

  eval "$opam_env" || return
  if [[ -z "$target" ]]; then
    unset OPAMSWITCH
  fi

  typeset -g _OPAM_ACTIVE_SWITCH="$target"
}
add-zsh-hook chpwd _opam_local_switch_hook

_initialize_opam() {
  (( ${+commands[opam]} )) || return

  # .zprofile resets PATH, so an inherited switch still needs its environment applied.
  unset _OPAM_ACTIVE_SWITCH

  local opam_init="${OPAMROOT:-$HOME/.opam}/opam-init"
  [[ ! -r "$opam_init/complete.zsh" ]] || source "$opam_init/complete.zsh"

  typeset -g _OPAM_DEFAULT_SWITCH="$(
    unset OPAMSWITCH OPAM_SWITCH_PREFIX
    # The lookup must not run switch hooks for this temporary directory change.
    cd -q "$HOME" && opam switch show --safe 2>/dev/null
  )"
  _opam_local_switch_hook
}

if [[ -n "$CURSOR_AGENT" ]]; then
  _initialize_opam
else
  zsh-defer _initialize_opam
fi

_initialize_dune_completion() {
  local completion="$HOME/.local/share/dune/completions/bash.sh"
  [[ -r "$completion" ]] || return 0

  # Dune's env.zsh repeats compinit, which Zim has already run.
  autoload -Uz bashcompinit && bashcompinit
  compopt() { return 0; } # Dune uses this Bash builtin, which bashcompinit does not provide.
  source "$completion"
}
zsh-defer _initialize_dune_completion

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Load machine-specific values last so they can override shared defaults.
source "$DOTFILES_PATH/local/main.sh"
