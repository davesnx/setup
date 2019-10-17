export PHP_PATH='/usr/local/opt/php@7.2'
export PYTHON_PATH='/usr/local/opt/python'
export RUBY_PATH='/usr/local/opt/ruby'
export GOPATH="$HOME/.go"
export GEM_HOME="$HOME/.gem"

export SBT_OPTS='-Xms512M -Xmx1024M -Xss2M -XX:MaxMetaspaceSize=512m -XX:ReservedCodeCacheSize=256M -Dfile.encoding=UTF8'
export SBT_CREDENTIALS="$HOME/.sbt/.credentials"

export FZF_DEFAULT_OPTS='--color=bg+:24 --reverse'

export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_ANALYTICS=true
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH=${DOTFILES_PATH}/mac/brew/Brewfile

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

paths=(
  "$HOME/bin"
  "$DOTFILES_PATH/bin"
  "$PHP_PATH/bin"
  "$PHP_PATH/sbin"
  "$RUBY_PATH/bin"
  "$GOPATH/bin"
  "$GEM_HOME/bin"
  "$PYTHON_PATH/libexec/bin"
  "/usr/local/bin"
  "/bin"
  "/usr/bin"
  "/usr/local/sbin"
  "/usr/sbin"
  "/sbin"
)

PATH=$(IFS=":"; echo "${paths[*]}";)

export PATH;

export EDITOR='code -w';

# Enable persistent REPL history for `node`.
export NODE_REPL_HISTORY=~/.node_history;
# Allow 32³ entries; the default is 1000.
export NODE_REPL_HISTORY_SIZE='32768';
# Use sloppy mode by default, matching web browsers.
export NODE_REPL_MODE='sloppy';

# Increase Bash history size. Allow 32³ entries; the default is 500.
export HISTSIZE='32768';
export HISTFILESIZE="${HISTSIZE}";
# Omit duplicates and commands that begin with a space from history.
export HISTCONTROL='ignoreboth';

# Highlight section titles in manual pages.
export LESS_TERMCAP_md="${yellow}";

# Don’t clear the screen after quitting a manual page.
export MANPAGER='less -X';

