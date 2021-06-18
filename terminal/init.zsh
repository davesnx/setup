#!/bin/zsh

# Register all aliases
for aliasToSource in "$DOTFILES_PATH/terminal/_aliases/"*;
  do source $aliasToSource;
done

# Register all exports
for exportToSource in "$DOTFILES_PATH/terminal/_exports/"*;
  do source $exportToSource;
done

# Register all functions
for functionToSource in "$DOTFILES_PATH/terminal/_functions/"*;
  do source $functionToSource;
done

# Load key-bindings
source $DOTFILES_PATH/terminal/zsh/key-bindings.zsh

# Load autojump
source /usr/local/share/autojump/autojump.zsh

# Load forgit
source "$DOTFILES_PATH/git/forgit.zsh"

# Load fzf
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# Load fnm a relacement of nvm
eval "`fnm env`"

# load opam
eval $(opam env)

# Load direnv
eval "$(direnv hook zsh)"

export GPG_TTY=$(tty)
