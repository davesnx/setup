if [[ -o interactive ]]; then
  if (( ${+functions[zsh-defer]} )); then
    [[ ! -r "$DOTFILES_PATH/terminal/opam-init/complete.zsh" ]] || zsh-defer source "$DOTFILES_PATH/terminal/opam-init/complete.zsh"
  else
    [[ ! -r "$DOTFILES_PATH/terminal/opam-init/complete.zsh" ]] || source "$DOTFILES_PATH/terminal/opam-init/complete.zsh"
  fi
  # [[ ! -r "$DOTFILES_PATH/terminal/opam-init/env_hook.zsh" ]] || source "$DOTFILES_PATH/terminal/opam-init/env_hook.zsh"
fi

source "$DOTFILES_PATH/terminal/opam-init/variables.sh" > /dev/null 2> /dev/null
