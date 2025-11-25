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

# ZSH Ops
setopt autopushd # Automatically adds directories to the directory stack when you use cd
unsetopt cdablevars # Disables the ability to use variable names as directory shortcuts with cd
setopt promptsubst # allow substitution in PS1

export GPG_TTY=$(tty)

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

export PYTHON_PATH='/usr/local/opt/python'
export RUBY_PATH='/usr/local/opt/ruby'
export GEM_HOME="$HOME/.gem"
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
export BUN_INSTALL="$HOME/.bun"
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

# dream > conf-libssl > openssl
export LDFLAGS="-L/usr/local/opt/openssl@3/lib"
export CPPFLAGS="-I/usr/local/opt/openssl@3/include"
export PKG_CONFIG_PATH="/usr/local/opt/openssl@3/lib/pkgconfig"

# Add identities to ssh
{
  ssh-add --apple-use-keychain ~/.ssh/id     &> /dev/null
  ssh-add --apple-use-keychain ~/.ssh/id_rsa &> /dev/null
} &!

# Initialize zsh-defer.
source ${ZIM_HOME}/modules/zsh-defer/zsh-defer.plugin.zsh

# Load zoxide
zsh-defer _evalcache zoxide init zsh

# Fuzzy Autocompletion
zstyle ':completion:*' completer _complete _match _approximate
zstyle ':completion:*:approximate:*' max-errors 3 numeric
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # match upper from lower case

ulimit -n 2048

# Load forgit
zsh-defer source "$DOTFILES_PATH/git/forgit.zsh"

# Load fzf (it should be loaded by zim)
zsh-defer source ~/.fzf.zsh
zsh-defer source "$DOTFILES_PATH/terminal/zsh/fzf-key-bindings.zsh"
export FZF_DEFAULT_OPTS="--color=bg+:24 --reverse --height 40% --history=$HOME/.fzf_history"
export FORGIT_LOG_FZF_OPTS="--no-height"
export FZF_COMPLETION_OPTS='+c -x'

# Load direnv
# eval "$(direnv hook zsh)"
zsh-defer _evalcache direnv hook zsh

# Load fnm a relacement of nvm
# eval "$(fnm env --use-on-cd --shell zsh)"
zsh-defer _evalcache fnm env --use-on-cd --shell zsh
export NODE_REPL_HISTORY=~/.node_history # Enable persistent REPL history for `node`.
export NODE_REPL_HISTORY_SIZE='32768' # Allow 32³ entries; the default is 1000.
export NODE_REPL_MODE='sloppy' # Use sloppy mode by default, matching web browsers.

# opam-zsh autocompletion (using version from dotfiles, not ~/.opam/opam-init)
zsh-defer source "$DOTFILES_PATH/terminal/opam-init/init.zsh"
# load opam
# eval "$(opam env)"
zsh-defer _evalcache opam env

# load dune autocompletions
compopt() { return 0; } # disable compopt since dune/env use bash compt with zsh
zsh-defer source $HOME/.local/share/dune/env/env.zsh

# load Alice env
# zsh-defer source "$HOME/.alice/env/env.zsh"
