# Input-style replacement and cancellation for zsh-shift-select.
_selection_replace() {
  zle shift-select::kill-region
  if [[ "$KEYS" == $'\e[200~' ]]; then
    zle bracketed-paste -w
  else
    zle self-insert -w
  fi
}
zle -N _selection_replace

_selection_collapse() {
  if [[ "$WIDGET" == _selection_left ]]; then
    (( CURSOR > MARK )) && CURSOR=$MARK
  else
    (( CURSOR < MARK )) && CURSOR=$MARK
  fi
  zle deactivate-region
  zle -K main
}
zle -N _selection_left _selection_collapse
zle -N _selection_right _selection_collapse

_selection_write_clipboard() {
  if [[ "$OSTYPE" == darwin* ]]; then
    print -rn -- "$1" | pbcopy
  else
    local encoded
    encoded=$(print -rn -- "$1" | base64) || return 1
    # OSC 52 reaches the local terminal over SSH. Base64 may wrap long input.
    print -rn -- $'\e]52;c;'"${encoded//$'\n'/}"$'\a'
  fi
}

_selection_clipboard() {
  (( REGION_ACTIVE && CURSOR != MARK )) || return 0
  local -i first=$CURSOR last=$MARK
  if (( first > last )); then
    first=$MARK
    last=$CURSOR
  fi
  if ! _selection_write_clipboard "${BUFFER[first+1,last]}"; then
    zle -M 'Could not copy selection to the clipboard'
    return 0
  fi
  if [[ "$WIDGET" == _selection_cut ]]; then
    zle shift-select::kill-region
  fi
}
zle -N _selection_copy _selection_clipboard
zle -N _selection_cut _selection_clipboard

# Consume these shortcuts even when no command text is selected.
() {
  local keymap
  for keymap in emacs shift-select; do
    # Ghostty sends Option+Shift even when the shell runs on Linux over SSH.
    bindkey -M "$keymap" '^[[1;4D' shift-select::backward-word
    bindkey -M "$keymap" '^[[1;4C' shift-select::forward-word
    bindkey -M "$keymap" '^[[1;2P' _selection_copy
    bindkey -M "$keymap" '^[[1;2Q' _selection_cut
  done
}

bindkey -M shift-select -R ' '-'~' _selection_replace
# Include UTF-8 input, decoded by the normal self-insert widget.
bindkey -M shift-select -R '\M-^@'-'\M-^?' _selection_replace
bindkey -M shift-select '^[[200~' _selection_replace
bindkey -M shift-select '^[^?' shift-select::kill-region
bindkey -M shift-select '^[[D' _selection_left
bindkey -M shift-select '^[OD' _selection_left
bindkey -M shift-select '^[[C' _selection_right
bindkey -M shift-select '^[OC' _selection_right
