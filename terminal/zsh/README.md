# Zsh startup

`.zshrc` sources `node-env.zsh` to initialize fnm and keep its project selection
after direnv. The file requires zsh and direnv. Interactive startup also uses
the `zsh-defer` function loaded by `.zshrc`. fnm is optional.

## Node selection

- `fnm env --shell zsh` creates the environment once per shell. Repeated
  sourcing reuses it without adding duplicate hooks or fnm PATH entries.
- `--fnm-dir "${FNM_DIR:-$HOME/.fnm}"` preserves the existing installation
  directory unless `FNM_DIR` specifies another one. fnm owns the state paths
  and links. The shell does not create them.
- `--version-file-strategy local` keeps selection limited to the current
  directory. At startup and after `cd`, a `.node-version` or `.nvmrc` file
  triggers `fnm use --silent-if-unchanged`. fnm reads the version file.
- Directories without either file keep the selected version. `package.json`
  alone does not trigger a switch. Missing versions produce fnm's error and
  are not installed automatically.
- Initialization runs before direnv records the base PATH. Project selection
  runs after direnv and puts fnm's Node first. With `CURSOR_AGENT` set, direnv
  loads synchronously. Otherwise it loads through `zsh-defer`, followed by
  another project selection.
- Failed `fnm env` output is not evaluated. Direnv still loads or is scheduled
  before the source operation returns the fnm failure. The Node hook skips
  selection until initialization succeeds, even with inherited fnm state.
  After correcting the cause, source the file again to retry. If direnv later
  restores a PATH recorded before recovery, the hook restores fnm's PATH entry.

`--use-on-cd` is not used: fnm 1.39.0 also checks `package.json`, does not select
the startup project, and does not restore Node precedence after direnv.

## Checks

Run from the repository root with Python 3 and zsh installed:

```sh
python3 terminal/zsh/tests/node-env.py
sh terminal/zsh/tests/agent-link.sh
```

The Node tests use a scratch HOME, XDG directories, and ZDOTDIR. They source
`node-env.zsh` in real zsh processes, not the user's startup files. Tests that
need fnm use the binary on PATH, or `FNM_TEST_BINARY=/absolute/path/to/fnm`.
Those tests skip when fnm is absent. The real direnv check also needs direnv on
PATH. Fake Node installations avoid downloads. Output records the selected
commands, versions, environment, and directory hooks.
