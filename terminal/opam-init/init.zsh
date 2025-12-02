if [[ -o interactive ]]; then
  [[ ! -r "$DOTFILES_PATH/terminal/opam-init/complete.zsh" ]] || source "$DOTFILES_PATH/terminal/opam-init/complete.zsh"
  [[ ! -r "$DOTFILES_PATH/terminal/opam-init/env_hook.zsh" ]] || source "$DOTFILES_PATH/terminal/opam-init/env_hook.zsh"
fi

source "$DOTFILES_PATH/terminal/opam-init/variables.sh" > /dev/null 2> /dev/null
