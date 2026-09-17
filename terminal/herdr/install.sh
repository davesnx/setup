#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

need herdr
need jq
PROFILE=$(select_profile "${1:-}")
HERDR_CONFIG_PATH="$DOTFILES_PATH/terminal/herdr/config.toml" herdr config check
link_path "$DOTFILES_PATH/terminal/herdr/config.toml" "$HOME/.config/herdr/config.toml"

# install_plugin OWNER/REPO COMMIT: install a GitHub plugin at a pinned commit.
# Reinstalling replaces the checkout, so skip when that commit is present.
install_plugin() {
  if ! herdr plugin list | grep -Fq "github:$1@$2"; then
    herdr plugin install "$1" --ref "$2" --yes
  fi
}

# Review agent diffs in hunk, v0.3.0. Its build needs Node 22.12+ and npm.
install_plugin jhochenbaum/herdr-hunk-diff b063856e85436668a165e511ed16a503ea729752

# Mirror remote Herdr workspaces into the sidebar, v0.4.3. Remote machines are
# viewed from the Mac, so SSH hosts skip it.
if [ "$PROFILE" = local ]; then
  install_plugin nikok6/herdr-mirror 195398c1275f9f3d18ddff70282149005a2bec01
  link_path "$DOTFILES_PATH/terminal/herdr/mirror-hosts.toml" "$HOME/.config/herdr-mirror/hosts.toml"
fi
