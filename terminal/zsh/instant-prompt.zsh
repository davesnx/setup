#! /bin/zsh
# Instant prompt - displays a prompt immediately before zsh finishes loading
# Inspired by powerlevel10k's instant prompt feature
#
# How it works:
# 1. This file is sourced at the very top of .zshrc
# 2. It immediately prints a static prompt (without git info)
# 3. User can start typing while the rest of .zshrc loads
# 4. Once fully loaded, the real prompt with git info appears

# Only run in interactive shells
[[ -o interactive ]] || return

# Skip if running in a subshell or script
[[ -z "$PS1" ]] && return

# Skip during benchmarks (testzsh sets this)
[[ -n "$ZSH_BENCHMARK" ]] && return

# Skip if already handled (e.g., nested shell)
(( _INSTANT_PROMPT_ACTIVE )) && return
typeset -gi _INSTANT_PROMPT_ACTIVE=1

# Compute the short pwd inline (same logic as prompt_short_pwd)
_instant_prompt_pwd() {
  if [[ $PWD == $HOME ]]; then
    print -n "~"
  else
    print -n ${${${:-/${(j:/:)${(M)${(s:/:)${(D)PWD:h}}#(|.)[^.]}}/${PWD:t}}//\/~/\~}/\/\//\/}
  fi
}

# Print the instant prompt (without git info - that loads later)
() {
  local prompt_char="→"
  local pwd_str="$(_instant_prompt_pwd)"

  # Print the prompt immediately
  # Format: yellow path, newline, green arrow
  print -Pn "%F{yellow}${pwd_str}%f\n%F{green}${prompt_char}%f "
}

# Hide cursor and disable echo while loading continues
# This allows the user to type ahead (input is buffered)
() {
  # Save terminal state
  typeset -g _INSTANT_PROMPT_TERM_STATE
  _INSTANT_PROMPT_TERM_STATE=$(stty -g 2>/dev/null)

  # Hide what user types (they can still type, it's just hidden)
  # Comment this out if you want to see what you type during load
  # stty -echo 2>/dev/null
}

# Function called after .zshrc finishes to "finalize" the prompt
_instant_prompt_finalize() {
  unset _INSTANT_PROMPT_ACTIVE

  # Restore terminal state if we modified it
  if [[ -n "$_INSTANT_PROMPT_TERM_STATE" ]]; then
    stty "$_INSTANT_PROMPT_TERM_STATE" 2>/dev/null
    unset _INSTANT_PROMPT_TERM_STATE
  fi

  # Clear the instant prompt line and let the real prompt take over
  # Move cursor up 2 lines (the pwd line and arrow line), clear to end
  print -n '\e[2A\e[J'

  # Remove this function from precmd
  precmd_functions=(${precmd_functions:#_instant_prompt_finalize})
}

# Register finalize to run once on first precmd (after .zshrc loads)
precmd_functions=(_instant_prompt_finalize $precmd_functions)

