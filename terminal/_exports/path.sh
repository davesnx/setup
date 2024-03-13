#! /usr/bin/env bash

paths=(
  "$HOME/bin"
  "$HOME/.deno/bin"
  "$HOME/.cargo/bin"
  "$HOME/.fly/bin"
  "$DOTFILES_PATH/bin"
  "$DOTFILES_PATH/bin/git-extras"
  "$DOTFILES_PATH/bin/ocaml"
  "$DOTFILES_PATH/bin/system"
  "$GEM_HOME/bin"
  "$PYTHON_PATH/libexec/bin"
  "/usr/local/opt/openssl@3/bin"
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
