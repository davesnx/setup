# Local overrides

Files in this directory separate machine-specific settings from the shared
setup. Git ignores the active files and tracks only `main.sh` and this
documentation.

Create one or more `.zsh` files for local shell configuration:

```sh
$EDITOR local/overrides.zsh
```

`main.sh` runs at the start of every shell. It links `local/gitconfig` to
`~/.gitconfig.local` when that link is missing, adds `local/bin` to `path`
when that directory exists, then sources every `.zsh` file here in name
order. Use the `.zsh` files for local paths, environment values, aliases, and
functions. Put machine-only commands in `local/bin`.

Keep literal credentials out of these files. Load them from the operating
system keychain, a password manager, or environment variables.
