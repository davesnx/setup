#!/usr/bin/env bash

paths=(
  "$HOME/bin"
  "$HOME/.cargo/bin"
  "$DOTFILES_PATH/bin"
  "$PHP_PATH/bin"
  "$PHP_PATH/sbin"
  "$RUBY_PATH/bin"
  "$GOPATH/bin"
  "$GEM_HOME/bin"
  "$PYTHON_PATH/libexec/bin"
  "/usr/local/opt/libpq/bin"
  "/usr/local/bin"
  "/usr/local/sbin"
  "/bin"
  "/sbin"
  "/usr/bin"
  "/usr/sbin"
)

PATH=$(IFS=":"; echo "${paths[*]}";)

export PATH;
