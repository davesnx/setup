# Local overrides

Files in this directory separate machine-specific settings from the shared
setup. Git ignores the active files and tracks only this documentation.

Create one or more `.zsh` files for local shell configuration:

```sh
$EDITOR local/overrides.zsh
```

All `.zsh` files load in name order after the shared shell configuration. Use
them for local paths, environment values, aliases, and functions. Put
machine-only commands in `local/bin` and add that directory to `path` from a
local `.zsh` file.

The root installer links `local/gitconfig` to `~/.gitconfig.local`. Git loads
it after the shared configuration, so its values take precedence.

Keep literal credentials out of these files. Load them from the operating
system keychain, a password manager, or environment variables.
