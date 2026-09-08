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

fpath=("$DOTFILES_PATH/terminal/zsh/themes" $fpath)
autoload -Uz promptinit && promptinit

prompt davesnx

# zsh options
setopt autopushd # Automatically adds directories to the directory stack when you use cd
unsetopt cdablevars # Disables the ability to use variable names as directory shortcuts with cd
setopt promptsubst # allow substitution in PS1

# GPG
export GPG_TTY=/dev/tty

source "$DOTFILES_PATH/terminal/_aliases/main.sh"
source "$DOTFILES_PATH/agents/main.sh"

# Restore SSH identities after a restart without blocking shell startup (macOS keychain).
if [[ "$OSTYPE" == darwin* ]] && ! ssh-add -l &> /dev/null; then
  {
    ssh-add --apple-use-keychain ~/.ssh/id     &> /dev/null
    ssh-add --apple-use-keychain ~/.ssh/id_rsa &> /dev/null
  } &!
fi

# Initialize zsh-defer
autoload -Uz ${ZIM_HOME}/modules/zsh-defer/zsh-defer

# Load autosuggestions (deferred for faster startup)
zsh-defer source ~/.zim/modules/zsh-autosuggestions/zsh-autosuggestions.zsh

eval "$(zoxide init zsh)"

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
  _fnm_autoload_hook # fnm's hook only runs on cd; also select the startup project
fi
eval "$(direnv hook zsh)"

# Load opam and switch automatically when entering or leaving a local switch.
_opam_local_switch_hook() {
  (( ${+commands[opam]} )) || return

  local switch_root="$PWD"
  while [[ "$switch_root" != "/" && ! -d "$switch_root/_opam" ]]; do
    switch_root="${switch_root:h}"
  done

  local target="$_OPAM_DEFAULT_SWITCH"
  [[ -d "$switch_root/_opam" ]] && target="$switch_root"

  [[ "$target" == "$_OPAM_ACTIVE_SWITCH" ]] && return

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

  local opam_init="${OPAMROOT:-$HOME/.opam}/opam-init"
  [[ ! -r "$opam_init/complete.zsh" ]] || source "$opam_init/complete.zsh"

  typeset -g _OPAM_DEFAULT_SWITCH="$(
    unset OPAMSWITCH OPAM_SWITCH_PREFIX
    cd "$HOME" && opam switch show --safe 2>/dev/null
  )"
  typeset -g _OPAM_ACTIVE_SWITCH="${OPAMSWITCH:-${OPAM_SWITCH_PREFIX:-}}"
  _opam_local_switch_hook
}

if [[ -n "$CURSOR_AGENT" ]]; then
  _initialize_opam
else
  zsh-defer _initialize_opam
fi

# Load dune autocompletions
compopt() { return 0; } # disable compopt since dune/env use bash compat with zsh
zsh-defer source $HOME/.local/share/dune/env/env.zsh

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Load machine-specific values last so they can override shared defaults.
source "$DOTFILES_PATH/local/main.sh"
