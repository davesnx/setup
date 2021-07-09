#! /usr/bin/env bash

alias d='docker'
alias dc="\${DOTFILES_PATH}/bin/docker/connect"
alias dps='docker run --rm -ti -v /var/run/docker.sock:/var/run/docker.sock quay.io/vektorlab/ctop:latest'
