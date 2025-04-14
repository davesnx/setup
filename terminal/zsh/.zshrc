#! /bin/zsh

# Start configuration added by Zim install {{{
  # User configuration sourced by interactive shells

  # History

  # Remove older command from the history if a duplicate is to be added.
  setopt HIST_IGNORE_ALL_DUPS

  # Input/output

  # Set editor default keymap to emacs (`-e`) or vi (`-v`)
  bindkey -e

  # Prompt for spelling correction of commands.
  setopt CORRECT

  # Remove path separator from WORDCHARS.
  WORDCHARS=""

  # completion
  zstyle ':zim:termtitle' format '%1~'

  # zsh-syntax-highlighting
  # Set what highlighters will be used.
  # See https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/docs/highlighters.md
  ZSH_HIGHLIGHT_HIGHLIGHTERS=(main brackets)

  # Customize the main highlighter styles.
  # See https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/docs/highlighters/main.md#how-to-tweak-it
  # typeset -A ZSH_HIGHLIGHT_STYLES
  # ZSH_HIGHLIGHT_STYLES[comment]='fg=242'

  # ------------------
  # Initialize modules
  # ------------------

  if [[ ! ${ZIM_HOME}/init.zsh -nt ${ZDOTDIR:-${HOME}}/.zimrc ]]; then
    # Update static initialization script if it does not exist or it's outdated, before sourcing it
    source ${ZIM_HOME}/zimfw.zsh init -q
  fi

  source ${ZIM_HOME}/init.zsh

  # ------------------------------
  # Post-init module configuration
  # ------------------------------

  #
  # zsh-history-substring-search
  #

  # Bind ^[[A/^[[B manually so up/down works both before and after zle-line-init
  bindkey '^[[A' history-substring-search-up
  bindkey '^[[B' history-substring-search-down

  # Bind up and down keys
  zmodload -F zsh/terminfo +p:terminfo
  if [[ -n ${terminfo[kcuu1]} && -n ${terminfo[kcud1]} ]]; then
    bindkey ${terminfo[kcuu1]} history-substring-search-up
    bindkey ${terminfo[kcud1]} history-substring-search-down
  fi

  bindkey '^P' history-substring-search-up
  bindkey '^N' history-substring-search-down
  bindkey -M vicmd 'k' history-substring-search-up
  bindkey -M vicmd 'j' history-substring-search-down
# }}} End configuration added by Zim install

export DOTFILES_PATH=$HOME/Code/github/setup

fpath=(/${ZDOTDIR:-${DOTFILES_PATH}}/terminal/zsh/themes $fpath)
autoload -Uz promptinit && promptinit

prompt davesnx

# ZSH Ops
setopt autopushd
unsetopt cdablevars

setopt HIST_IGNORE_DUPS # Don't record an entry that was just recorded again.
setopt HIST_IGNORE_ALL_DUPS # Delete old recorded entry if new entry is a duplicate.
setopt no_share_history # No share history between all sessions.
setopt HIST_REDUCE_BLANKS # Remove superfluous blanks before recording entry.
setopt hist_ignore_space # ignore commands that start with space
HISTFILE=~/.zhistory

# Removing the waiting dots from completion (...). Original: ~/.zim/modules/input/init.zsh
expand-or-complete-with-redisplay() {
  zle expand-or-complete
  zle redisplay
}

# iTerm tab name
precmd() {
  echo -ne "\e]1;$(short_pwd)\a"
}

# Register all aliases
for aliasToSource in "$DOTFILES_PATH/terminal/_aliases/"*; do
  source $aliasToSource;
done

# Register all exports
for exportToSource in "$DOTFILES_PATH/terminal/_exports/"*; do
  source $exportToSource;
done

# Register all functions
for functionToSource in "$DOTFILES_PATH/terminal/_functions/"*; do
  source $functionToSource;
done

# Load forgit
source "$DOTFILES_PATH/git/forgit.zsh"

# Load fzf
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# Load key-bindings for fzf
source "$DOTFILES_PATH/terminal/zsh/key-bindings.zsh"

# Load fnm a relacement of nvm
eval "$(fnm env --use-on-cd --shell zsh)"

# load opam
# echo "$(opam env --sexp)" | awk -f $DOTFILES_PATH/scripts/opam_env_awk.awk
eval "$(opam env)"

# opam-zsh autocompletion
[[ ! -r /Users/davesnx/.opam/opam-init/init.zsh ]] || source /Users/davesnx/.opam/opam-init/init.zsh > /dev/null 2> /dev/null

# Load direnv
eval "$(direnv hook zsh)"

export GPG_TTY=$(tty)

# Add identities to ssh
ssh-add --apple-use-keychain ~/.ssh/id &> /dev/null
ssh-add --apple-use-keychain ~/.ssh/id_rsa &> /dev/null

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # match upper from lower case

ulimit -n 2048

# dune
source $HOME/.local/share/dune/env/env.zsh

# load autocompletion (not sure if it's the right thing with zim)
autoload -Uz compinit
compinit
