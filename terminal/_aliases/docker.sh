#!/usr/bin/env bash

alias d='docker'
alias dc="$DOTFILES_PATH/bin/docker/connect"

alias dps='docker run --rm -ti -v /var/run/docker.sock:/var/run/docker.sock quay.io/vektorlab/ctop:latest'

# Draftbit
alias startdb="docker run --name draftbit -e POSTGRES_PASSWORD=draftbit123 -e POSTGRES_USER=draftbit -p 5432:5432 -d postgres"
alias restartdb="docker restart 'draftbit'"
