# Setup checks

Run from the repository root before committing:

```sh
bash check.sh
```

Requirements: Git, Bash, Zsh, ShellCheck 0.11+, shfmt, Bun 1.3.14,
Node 22.22.3 with npm, and Python 3. On macOS, `brew install bash shellcheck
shfmt` provides the check tools alongside the system Bash 3.2 and Zsh.

The same command runs on Linux and macOS for every GitHub push and pull request.
It checks:

- ShellCheck findings, including extensionless commands and local imports, plus
  Zsh syntax. Run only this part with `bash shellcheck.sh`.
- Formatting of the check scripts and rewritten Git effort command.
- Argument handling, collections, and logging in both system and PATH Bash,
  plus shared helpers in Zsh.
- Git effort counts, filtering, unusual filenames, command failure, and temporary
  file cleanup; filesystem counts and Monday's standup date handling.
- Command-line help parsing, Zsh startup, SSH agent links, and PATH inheritance.
- npm-wrapper argument forwarding, failure handling, and real offline package
  install/update/removal through the shared manifest links.
- MCP declaration: `agents/mcp.json` validates, the rendered files match it,
  and OpenCode accepts the shared file merged with each host profile when
  `opencode` is installed.
- Repository layout against `AGENTS.md`: every path in its tree exists, every
  tracked directory in the first two levels has a row, and no tracked symlink
  is absolute.
- On macOS, installer ordering, reruns, backups, failure recovery, native Node
  selection, and Choosy settings restoration.

Installer tests use temporary homes and stub system-changing commands. The npm
tests use an offline fixture and temporary manifests. These checks do not install
the dotfiles or replace the current machine's application settings.

## Check on nspawn

nspawn has ShellCheck 0.9, Node, npm, Python 3, Zsh, and rsync, but no `shfmt`
and no `bun`, so `check.sh` cannot run there. Before each commit, copy the
working tree to a scratch directory on nspawn and run the checks that can:

```sh
rsync -a --delete --exclude node_modules --exclude .venv --exclude .cache \
  --exclude .npm --exclude __pycache__ \
  -e 'ssh -o ClearAllForwardings=yes' ./ nspawn:.cache/setup-check/
ssh -o ClearAllForwardings=yes nspawn bash -s <<'EOF'
cd ~/.cache/setup-check
bash terminal/core/test.sh && zsh terminal/core/test.sh
sh terminal/zsh/tests/agent-link.sh
zsh terminal/node/tests/npm-wrapper.zsh
EOF
```

The copy includes `.git`, so it carries uncommitted changes and Git-based
scripts work. Its ShellCheck is older than the version the Mac and CI use and
reports notes they do not, so ShellCheck findings count only from the Mac or
CI. `terminal/bin/git-extras/test.sh` needs `bun` and cannot run there.

After pushing, update the real checkout, rerun the installer of each changed
module, and open a new shell:

```sh
ssh nspawn 'cd ~/workplace/davesnx/setup && git pull --ff-only origin main && sh terminal/<module>/install.sh'
```

## Check shell selection

After installing the Zim modules from `terminal/zsh/.zimrc`, run:

```sh
python3 terminal/zsh/tests/selection.py
```

This test sends keystrokes through real ZLE. It checks Option+Shift word
selection on both hosts and the existing Ctrl+Shift bindings on Linux. It also
checks replacement, deletion, undo, copy, cut, repeated loading, and clipboard
failure recovery. The test mocks the macOS clipboard command and captures Linux
OSC 52 output. It does not change or read the desktop clipboard. These tests
need installed Zim modules and run separately from `check.sh`.

On macOS, selected-text copy and cut use the system clipboard command. On Linux,
they send an OSC 52 clipboard write to the terminal over SSH. This requires
`base64` and a terminal that accepts OSC 52 writes. Ghostty allows these writes
by default. Through tmux, keep `set-clipboard on`. Other terminal multiplexers
must also pass clipboard writes to the client.

From a Herdr pane, check the configured copy, cut, and undo keys with:

```sh
python3 terminal/zsh/tests/selection-herdr.py
```

This uses a temporary pane and a mock clipboard. For a desktop check, open a
fresh Ghostty SSH shell and type `hello world` without pressing Enter. Select
`world` with Option+Shift+Left, press Cmd+C, and paste into a text editor.
Confirm that only `world` appears. Then press Cmd+X in the shell. Confirm that
`hello ` remains and the clipboard still contains `world`. Repeat through your
terminal multiplexer. OSC 52 has no write acknowledgement, so a successful
shell test does not prove desktop delivery.

## Changes that need a real smoke test

Tests cannot prove that external apps, downloads, or future package versions work.
After changing installation or app integration, check the affected feature on a
disposable machine or account: run setup, run it again, open a fresh terminal,
and launch the affected app or CLI. Check both ARM64 and x64 when changing native
runtime selection.

To make CI a merge gate, configure a GitHub branch ruleset for `main` that requires
both `Check (ubuntu-latest)` and `Check (macos-latest)` and pull requests. The
workflow reports failures on direct pushes but cannot prevent those pushes.
