#!/bin/sh
apply_patch_command() {
  sh "$1" || return $?
  printf 'patched\n'
}
apply_patch_command "$1"
