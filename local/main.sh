for local_config in "$DOTFILES_PATH"/local/*.zsh(N); do
  source "$local_config"
done

unset local_config
