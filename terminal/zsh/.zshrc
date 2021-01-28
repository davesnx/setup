#!/bin/zsh

export DOTFILES_PATH=$HOME/dev/setup
export ZIM_HOME=${ZDOTDIR:-${HOME}}/.zim

# ZSH Ops
setopt autopushd

setopt HIST_IGNORE_DUPS # Don't record an entry that was just recorded again.
setopt HIST_IGNORE_ALL_DUPS # Delete old recorded entry if new entry is a duplicate.
setopt no_share_history # No share history between all sessions.
setopt HIST_REDUCE_BLANKS # Remove superfluous blanks before recording entry.
setopt hist_ignore_space # ignore commands that start with space
HISTFILE=~/.zhistory

# Start zim
source ${ZIM_HOME}/init.zsh

# Removing the waiting dots from completion (...). Original: ~/.zim/modules/input/init.zsh
expand-or-complete-with-redisplay() {
  zle expand-or-complete
  zle redisplay
}

# iTerm tab name
precmd() {
  echo -ne "\e]1;$(short_pwd)\a"
}

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={  A-Z}' # match upper from lower case

source $DOTFILES_PATH/terminal/init.zsh

fpath=(/${ZDOTDIR:-${DOTFILES_PATH}}/terminal/zsh/themes $fpath)
autoload -Uz promptinit && promptinit
prompt davesnx


source $DOTFILES_PATH/terminal/zsh/key-bindings.zsh
source $DOTFILES_PATH/terminal/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

# Load autojump
source /usr/local/share/autojump/autojump.zsh

# Load forgit
source "$DOTFILES_PATH/git/forgit.zsh";

test -e "${HOME}/.iterm2_shell_integration.zsh" && source "${HOME}/.iterm2_shell_integration.zsh"

# Load fzf
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# Load fnm a relacement of nvm
eval "`fnm env --multi`"

# load opam
eval $(opam env)

# Load direnv
eval "$(direnv hook zsh)"
