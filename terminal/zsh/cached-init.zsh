#! /bin/zsh
# direnv and zoxide print the same hook text on every start. _cached_init
# sources a cached copy and rebuilds it when the command resolves to another
# file, such as a new Homebrew version, or has a newer modification time.
# fnm is not cached: it creates a separate environment for each shell.
_cached_init() {
  (( ${+commands[$1]} )) || return 0
  local bin="${commands[$1]:A}" cache="${XDG_CACHE_HOME:-$HOME/.cache}/zsh/$1.zsh" first=''
  { read -r first <"$cache"; } 2>/dev/null || first=''
  if [[ "$first" != "# $bin" || ! "$cache" -nt "$bin" ]]; then
    mkdir -p "${cache:h}" && { print -r -- "# $bin"; "$@"; } >|"$cache" || { : >|"$cache"; return 1; }
  fi
  source "$cache"
}
