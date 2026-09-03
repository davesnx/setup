#! /bin/zsh

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

# register all aliases
source "$DOTFILES_PATH/terminal/_aliases/alias.sh"
source "$DOTFILES_PATH/terminal/_aliases/fp.sh"
source "$DOTFILES_PATH/terminal/_aliases/git.sh"
source "$DOTFILES_PATH/terminal/_aliases/func.sh"

# Restore SSH identities after a restart without blocking shell startup (macOS keychain).
if [[ "$OSTYPE" == darwin* ]] && ! ssh-add -l &> /dev/null; then
  {
    ssh-add --apple-use-keychain ~/.ssh/id     &> /dev/null
    ssh-add --apple-use-keychain ~/.ssh/id_rsa &> /dev/null
  } &!
fi

# Initialize zsh-defer
autoload -Uz ${ZIM_HOME}/modules/zsh-defer/zsh-defer

# Refresh native wordcode after edits; Zsh ignores it whenever the source is newer.
_zshrc_source="$DOTFILES_PATH/terminal/zsh/.zshrc"
[[ "$_zshrc_source.zwc" -nt "$_zshrc_source" ]] || zsh-defer zcompile "$_zshrc_source"
unset _zshrc_source

# Load autosuggestions (deferred for faster startup)
zsh-defer source ~/.zim/modules/zsh-autosuggestions/zsh-autosuggestions.zsh

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

# Load direnv synchronously for command-mode agent shells.
if [[ -n "$CURSOR_AGENT" ]]; then
  eval "$(direnv hook zsh)"
  _direnv_hook
else
  zsh-defer -c 'eval "$(direnv hook zsh)"'
fi

# Load fnm
_fnm_post_direnv_hook() {
  if command -v fnm &>/dev/null && [[ -f .node-version || -f .nvmrc ]]; then
    eval "$(fnm env --shell zsh)"
    fnm use --silent-if-unchanged
  fi
}
add-zsh-hook chpwd _fnm_post_direnv_hook

if command -v fnm &>/dev/null; then
  zmodload zsh/datetime
  zmodload -F zsh/files b:zf_ln
  export FNM_DIR="$HOME/.fnm"
  export FNM_MULTISHELL_PATH="$HOME/.local/state/fnm_multishells/${$}_${EPOCHREALTIME//./}"
  export FNM_VERSION_FILE_STRATEGY="local"
  export FNM_LOGLEVEL="info"
  export FNM_NODE_DIST_MIRROR="https://nodejs.org/dist"
  export FNM_COREPACK_ENABLED="false"
  export FNM_RESOLVE_ENGINES="true"
  zf_ln -s "$FNM_DIR/aliases/default" "$FNM_MULTISHELL_PATH"
  export PATH="$FNM_MULTISHELL_PATH/bin:$PATH"
  rehash
  zmodload -u zsh/files zsh/datetime
fi

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
for local_config in "$DOTFILES_PATH"/local/*.zsh(N); do
  source "$local_config"
done
unset local_config
