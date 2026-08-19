# Local overrides

Files in this directory separate machine-specific settings from the shared
setup. Git ignores the active files and tracks only this documentation and the
examples.

Copy the examples without the `.example` suffix:

```sh
cp local/overrides.zsh.example local/overrides.zsh
cp local/gitconfig.example local/gitconfig
```

`overrides.zsh` loads after the shared shell configuration. Use it for local
paths, environment values, aliases, and functions. Put machine-only commands
in `local/bin` and add that directory to `path` from the override file.

The root installer links `local/gitconfig` to `~/.gitconfig.local`. Git loads
it after the shared configuration, so its values take precedence.

Keep literal credentials out of these files. Load them from the operating
system keychain, a password manager, or environment variables.
