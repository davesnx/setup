#!/usr/bin/env bash

# Intuitive map function
# For example, to list all directories that contain a certain file:
# find . -name .gitattributes | map dirname
alias map="xargs -n1"

# Get n argument
take() {
  head -n "${1}"
}

# Generate a list
list() {
  for i in "$@"; do
    echo "$i"
  done
}

alias hd="head -n 1"
alias tl="command tail -n 1"
