# Herdr setup

The root installer links `config.toml` to `~/.config/herdr/config.toml`.
To install only this configuration, run from the repository root:

```sh
sh terminal/herdr/install.sh
```

Existing configuration is backed up through `prelude.sh`. Repeated runs leave
the installed link unchanged.

The configuration uses Ctrl-A to match Ghostty's keybindings. The custom
workspace shortcuts for `0` and `9` require `jq`.

The Mac Brewfile installs Herdr and `jq`. On Linux, install both separately.
This script installs configuration only. Check the installed configuration with
`herdr config check`.
