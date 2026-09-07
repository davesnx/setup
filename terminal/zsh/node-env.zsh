#!/bin/zsh

autoload -Uz add-zsh-hook

_fnm_post_direnv_hook() {
  (( ${+commands[fnm]} )) || return 0
  [[ -n ${_setup_fnm_initialized:-} ]] || return 0

  if [[ -f .node-version || -f .nvmrc ]]; then
    # A project version takes precedence over Node paths loaded by direnv.
    path=("$FNM_MULTISHELL_PATH/bin" "${(@)path:#"$FNM_MULTISHELL_PATH/bin"}")
    fnm use --silent-if-unchanged
  elif (( ! ${path[(Ie)$FNM_MULTISHELL_PATH/bin]} )); then
    # After recovery, direnv can restore a PATH recorded before fnm existed.
    path=("$FNM_MULTISHELL_PATH/bin" "${path[@]}")
  fi
}

add-zsh-hook chpwd _fnm_post_direnv_hook

() {
  local fnm_env fnm_status=0
  # Initialize before direnv records the PATH it restores on project exit.
  if (( ${+commands[fnm]} )) && [[ -z ${_setup_fnm_initialized:-} ]]; then
    if fnm_env="$(fnm env --shell zsh --fnm-dir "${FNM_DIR:-$HOME/.fnm}" --version-file-strategy local)" && eval "$fnm_env"; then
      typeset -g _setup_fnm_initialized=1
    else
      fnm_status=$?
    fi
  fi

  if [[ -n "$CURSOR_AGENT" ]]; then
    eval "$(direnv hook zsh)"
    _direnv_hook
  else
    # Reapply the project selection after the deferred direnv startup export.
    zsh-defer -c 'eval "$(direnv hook zsh)"; _direnv_hook; _fnm_post_direnv_hook'
  fi

  (( fnm_status == 0 )) || return "$fnm_status"
  _fnm_post_direnv_hook
}
