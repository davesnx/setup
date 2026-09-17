#!/bin/zsh

# Homebrew config
export HOMEBREW_AUTO_UPDATE_SECS=86400
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_INSTALL_BADGE="(ʘ‿ʘ)"
export HOMEBREW_BUNDLE_FILE_PATH="$DOTFILES_PATH/mac/brew/Brewfile"

() {
  local brew_path brew_env ghostty_completion ghostty_completion_link brew_variable
  local -aU brew_paths

  # Match the installer's preference for native Brew over a legacy PATH entry.
  brew_path=$(PATH="${BREW_SEARCH_PATHS:-/opt/homebrew/bin:/usr/local/bin}:$PATH" command -v brew) || return 0
  brew_env=$("$brew_path" shellenv sh) || return
  eval "$brew_env"
  path=("${(@u)path}")

  # Ghostty is renamed to Terminal.app; Homebrew still links to Ghostty.app.
  ghostty_completion=/Applications/Terminal.app/Contents/Resources/zsh/site-functions/_ghostty
  ghostty_completion_link=$HOMEBREW_PREFIX/share/zsh/site-functions/_ghostty
  if [[ -f "$ghostty_completion" && -L "$ghostty_completion_link" && ! "$ghostty_completion_link" -ef "$ghostty_completion" ]]; then
    ln -sfn "$ghostty_completion" "$ghostty_completion_link"
  fi

  export LDFLAGS="-L$HOMEBREW_PREFIX/opt/openssl@3/lib"
  export CPPFLAGS="-I$HOMEBREW_PREFIX/opt/openssl@3/include"
  for brew_variable in PKG_CONFIG_PATH LIBRARY_PATH C_INCLUDE_PATH; do
    case "$brew_variable" in
      PKG_CONFIG_PATH) brew_paths=("$HOMEBREW_PREFIX/lib/pkgconfig" "$HOMEBREW_PREFIX/opt/openssl@3/lib/pkgconfig") ;;
      LIBRARY_PATH) brew_paths=("$HOMEBREW_PREFIX/opt/libev/lib" "$HOMEBREW_PREFIX/lib") ;;
      C_INCLUDE_PATH) brew_paths=("$HOMEBREW_PREFIX/include") ;;
    esac
    brew_paths+=(${(@s.:.)${(P)brew_variable}})
    export "$brew_variable=${(j.:.)brew_paths}"
  done
}
