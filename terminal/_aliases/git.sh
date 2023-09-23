#! /usr/bin/env bash

alias gs="git status -s"
alias gc="git checkout"
alias gp="git push"
alias gpl="git pull"
alias glh="git rev-parse --sq HEAD | tr \"'\" ' ' | tr -d ' '"
alias gm='git commit -m'
alias gma='git commit --amend'
alias gcl='git clone'
alias gf="git fetch"
alias gam="git commit --amend --no-edit"
alias master='git checkout master'
alias main='git checkout main'

# forgit
alias gl='forgit::log'
alias ga='forgit::add'
alias gd='forgit::diff'
alias gitignore='forgit::ignore'
