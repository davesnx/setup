export DOTFILES_PATH=$HOME/dev/setup

source $DOTFILES_PATH/terminal/init.sh
source $DOTFILES_PATH/terminal/bash/themes/theme.sh
source /usr/local/opt/fzf/shell/key-bindings.bash

[ -f ~/.fzf.bash ] && source ~/.fzf.bash
