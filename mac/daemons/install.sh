#!/bin/sh

setup_path=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
. "$setup_path/prelude.sh"

opener_agent="$HOME/Library/LaunchAgents/com.davesnx.xdg-open.plist"
claude_remote_agent="$HOME/Library/LaunchAgents/com.davesnx.claude-remote-control.plist"

# Open remote Linux browser links on this Mac.
link_path_guarded "$setup_path/terminal/bin/xdg-open-listener" "$HOME/.local/bin/xdg-open-listener"
link_path_guarded "$setup_path/mac/daemons/com.davesnx.xdg-open.plist" "$opener_agent"
link_path_guarded "$setup_path/terminal/bin/ensure-claude-remote-control" "$HOME/.local/bin/ensure-claude-remote-control"
link_path_guarded "$setup_path/mac/daemons/com.davesnx.claude-remote-control.plist" "$claude_remote_agent"

launch_domain="gui/$(id -u)"
launchctl bootout "$launch_domain/com.davesnx.xdg-open" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$opener_agent"
launchctl bootout "$launch_domain/com.davesnx.claude-remote-control" 2>/dev/null || true
launchctl bootstrap "$launch_domain" "$claude_remote_agent"
