export OPENCODE_ENABLE_EXA=1

# Load the selected OpenCode host profile when it is installed.
if [[ -f "$HOME/.config/opencode/host.jsonc" ]]; then
  export OPENCODE_CONFIG="$HOME/.config/opencode/host.jsonc"
fi
