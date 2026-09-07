# Local overrides

Files in this directory separate machine-specific settings from the shared
setup. Git ignores the active files and tracks only `install.sh`, `main.sh`,
and this documentation.

Create one or more `.zsh` files for local shell configuration:

```sh
$EDITOR local/overrides.zsh
```

`install.sh` runs once when a machine is set up. It links `local/gitconfig` to
`~/.gitconfig.local` when that file exists.

`main.sh` runs at every shell start. It only adds `local/bin` to `path` when
that directory exists, then sources every `.zsh` file here in name order. Use
the `.zsh` files for local paths, environment values, aliases, and functions.
Put machine-only commands in `local/bin`.

Keep literal credentials out of these files. Load them from the operating
system keychain, a password manager, or environment variables.
