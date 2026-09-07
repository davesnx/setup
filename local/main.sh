# Local machine overrides. Sourced by .zshrc at the end of every shell start.

if [[ -e "$DOTFILES_PATH/local/gitconfig" && ! -e "$HOME/.gitconfig.local" ]]; then
  ln -s "$DOTFILES_PATH/local/gitconfig" "$HOME/.gitconfig.local"
fi

if [[ -d "$DOTFILES_PATH/local/bin" ]]; then
  path=("$DOTFILES_PATH/local/bin" $path)
fi

for local_config in "$DOTFILES_PATH"/local/*.zsh(N); do
  source "$local_config"
done
unset local_config
