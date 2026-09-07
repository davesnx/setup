#!/bin/sh

set -eu

# Open remote Linux browser links on this Mac.
setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)

opener_bin="$HOME/.local/bin/xdg-open-listener"
opener_agent="$HOME/Library/LaunchAgents/com.davesnx.xdg-open.plist"
claude_remote_bin="$HOME/.local/bin/ensure-claude-remote-control"
claude_remote_agent="$HOME/Library/LaunchAgents/com.davesnx.claude-remote-control.plist"
mkdir -p "$HOME/.local/bin" "$HOME/Library/LaunchAgents"

if [ -e "$opener_bin" ] && [ ! -L "$opener_bin" ]; then
  echo "Cannot replace opener executable: $opener_bin" >&2
  exit 73
fi
if [ -e "$opener_agent" ] && [ ! -L "$opener_agent" ]; then
  echo "Cannot replace LaunchAgent: $opener_agent" >&2
  exit 73
fi
if [ -e "$claude_remote_bin" ] && [ ! -L "$claude_remote_bin" ]; then
  echo "Cannot replace Claude Remote Control executable: $claude_remote_bin" >&2
  exit 73
fi
if [ -e "$claude_remote_agent" ] && [ ! -L "$claude_remote_agent" ]; then
  echo "Cannot replace LaunchAgent: $claude_remote_agent" >&2
  exit 73
fi

ln -sfn "$setup_path/terminal/bin/xdg-open-listener" "$opener_bin"
ln -sfn "$setup_path/mac/daemons/com.davesnx.xdg-open.plist" "$opener_agent"
ln -sfn "$setup_path/terminal/bin/ensure-claude-remote-control" "$claude_remote_bin"
ln -sfn "$setup_path/mac/daemons/com.davesnx.claude-remote-control.plist" "$claude_remote_agent"

launch_domain="gui/$(id -u)"
launchctl bootout "$launch_domain/com.davesnx.xdg-open" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$opener_agent"
launchctl bootout "$launch_domain/com.davesnx.claude-remote-control" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$claude_remote_agent"
