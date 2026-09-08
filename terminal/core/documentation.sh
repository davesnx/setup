#! /usr/bin/env bash

extract_help() {
  local -r file="$1"
  grep "^##?" "$file" | cut -c 5-
}

_compose_version() {
  local -r file="$1"
  local -r version_code=$(grep "^#??" "$file" | cut -c 5- || echo "unversioned")
  local -r git_info=$(cd "$(dirname "$file")" && git log -n 1 --pretty=format:'%h%n%ad%n%an%n%s' --date=format:'%Y-%m-%d %Hh%M' -- "$(basename "$file")")
  echo -e "${version_code}\n${git_info}"
}

# Parse "$@" against the ##? usage block of the calling script into shell
# variables, or print the help or version and exit. Inside a zsh function $0
# is the function name, so zsh scripts are found through ZSH_ARGZERO.
docs::parse() {
  local -r file="${ZSH_ARGZERO:-$0}"
  local -r docopts="${DOTFILES_PATH}/terminal/core/utils/docopts.ts"

  if ! platform::command_exists bun; then
    log::error "You need to have bun installed in order to run $docopts"
    exit 1
  fi

  if [[ ${1:-} == "--version" ]]; then
    eval "$("$docopts" -h "$(extract_help "$file")" -V "$(_compose_version "$file")" : "$@")"
  else
    eval "$("$docopts" -h "$(extract_help "$file")" : "$@")"
  fi
}
