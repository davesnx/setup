#!/bin/bash
set -euo pipefail

zsh -n \
  terminal/zsh/.zshrc \
  terminal/zsh/.zprofile \
  terminal/zsh/.zimrc \
  terminal/zsh/instant-prompt.zsh \
  terminal/zsh/themes/prompt_davesnx_setup

ZSH_BENCHMARK=1 zsh -l -i -c '
  [[ $options[interactive] == on ]]
  [[ -n $PS1 ]]
  (( ${+functions[prompt_short_pwd]} ))
  (( ${+functions[history-substring-search-up]} ))
  (( ${+functions[_fnm_post_direnv_hook]} ))
  (( ${+functions[_opam_local_switch_hook]} ))
  (( ${+functions[spawn]} ))
  (( ${+aliases[testzsh]} ))
  [[ $HISTSIZE == 32768 ]]
  [[ $KEYTIMEOUT == 40 ]]
  [[ $options[correct] == on ]]
  [[ $options[extendedglob] == on ]]
  [[ $options[promptsubst] == on ]]
' >/dev/null 2>&1
