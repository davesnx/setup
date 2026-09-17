# Herdr setup

The root installer links `config.toml` to `~/.config/herdr/config.toml`.
To install only this configuration, run from the repository root:

```sh
DOTFILES_PATH="$PWD" sh terminal/herdr/install.sh
```

Existing configuration is backed up through `prelude.sh`. Repeated runs leave
the installed link unchanged.

The configuration uses Ctrl-A to match Ghostty's keybindings. The custom
workspace shortcuts for `0` and `9` require `jq`.

The Mac Brewfile installs Herdr and `jq`. On Linux, install both separately.
Check the installed configuration with `herdr config check`.

## Plugins

The installer adds two GitHub plugins with `herdr plugin install`, each pinned
to the commit named in `install.sh`. Herdr keeps their checkouts under
`~/.config/herdr/plugins/`. Reruns skip a plugin while its commit is present.
To update one, change its commit in `install.sh`, rerun the installer, and run
`herdr server reload-config`.

### herdr-hunk-diff

[herdr-hunk-diff](https://github.com/jhochenbaum/herdr-hunk-diff) opens
agent-authored diffs in hunk and sends inline comments back to the agent. Its
build needs Node 22.12 or newer and npm. The keybindings live in `config.toml`
rather than coming from the plugin's `setup-keys` action, which would write
through the config link:

| Key              | Action                 |
| ---------------- | ---------------------- |
| `prefix+shift+r` | Review changes         |
| `prefix+shift+s` | Send review to agent   |
| `prefix+shift+c` | Review the last commit |
| `prefix+shift+a` | Review staged changes  |

The plugin default for review, `prefix+shift+h`, is Herdr's swap-pane-left key.
Plugin settings such as automatic opening go in
`$(herdr plugin config-dir jhochenbaum.hunkdiff)/config.toml`; the defaults
are in use.

### herdr-mirror

[herdr-mirror](https://github.com/nikok6/herdr-mirror) shows a remote Herdr
server's workspaces and agents in the local sidebar and streams their panes.
Its build downloads a prebuilt binary and links `~/.local/bin/herdr-mirror`.
Both ends need a Herdr with terminal session streams: preview build 2026-06-30
or newer, or a stable release that includes them. Remote machines are viewed
from the Mac, so the installer adds this plugin on the `local` profile only and
links `mirror-hosts.toml` to `~/.config/herdr-mirror/hosts.toml`. As with the
Claude Code and OpenCode installers, the first argument, `local` or `ssh`,
overrides the detected profile.

The daemon starts when a workspace gains focus, and `herdr-mirror status`
reports the loaded config and each host. The actions have no keys; the plugin
README lists suggested bindings.
