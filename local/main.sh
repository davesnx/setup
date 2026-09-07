# Sourced by terminal/zsh/.zshrc at the end of every shell start.

if [[ -d "$DOTFILES_PATH/local/bin" ]]; then
  path=("$DOTFILES_PATH/local/bin" $path)
fi

for local_config in "$DOTFILES_PATH"/local/*.zsh(N); do
  source "$local_config"
done
unset local_config
