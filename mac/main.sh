if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Ghostty is renamed to Terminal.app; Homebrew still links to Ghostty.app.
ghostty_completion=/Applications/Terminal.app/Contents/Resources/zsh/site-functions/_ghostty
ghostty_completion_link=${HOMEBREW_PREFIX:-/opt/homebrew}/share/zsh/site-functions/_ghostty
if [[ -f "$ghostty_completion" && -L "$ghostty_completion_link" && ! "$ghostty_completion_link" -ef "$ghostty_completion" ]]; then
  ln -sfn "$ghostty_completion" "$ghostty_completion_link"
fi
unset ghostty_completion ghostty_completion_link

# Homebrew config
export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH="$DOTFILES_PATH/mac/brew/Brewfile"

export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/opt/openssl@3/lib/pkgconfig:$PKG_CONFIG_PATH"
export LIBRARY_PATH="/opt/homebrew/opt/libev/lib:/opt/homebrew/lib:$LIBRARY_PATH"
export C_INCLUDE_PATH="/opt/homebrew/include:$C_INCLUDE_PATH"
