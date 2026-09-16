# Setup checks

Run from the repository root before committing:

```sh
bash check.sh
```

Requirements: Git, Bash, Zsh, ShellCheck 0.11+, shfmt, Bun 1.3.14,
Node 22.22.3 with npm, Python 3, and jq. On macOS, `brew install bash shellcheck
shfmt jq` provides the check tools alongside the system Bash 3.2 and Zsh.

The same command runs on Linux and macOS for every GitHub push and pull request.
It checks:

- ShellCheck findings, including extensionless commands and local imports, plus
  Zsh syntax, including `.zimrc` and Zsh startup filenames without shebangs.
  Run only this part with `bash shellcheck.sh`.
- Formatting of the check scripts, Git effort command, and `testzsh`.
- Argument handling, collections, and logging in both system and PATH Bash,
  plus shared helpers in Zsh.
- Git effort counts, filtering, unusual filenames, command failure, and temporary
  file cleanup; filesystem counts and Monday's standup date handling.
- Command-line help parsing, Zsh startup, SSH agent links, PATH inheritance, and
  cached direnv and zoxide hooks.
- `testzsh` timing, profiling, and source-line tracing in system and PATH Bash.
  The adjacent test uses real Zsh with `env -i` and temporary homes. It checks
  25 timing lines, startup order through `.zlogin`, login/interactive flags,
  function costs, source and subshell timing, the final startup interval,
  escaped filenames, secret-free output, status preservation, and exported
  `ZDOTDIR` states. It also checks failed startups, changed DEBUG traps,
  backwards clock detection, repeated cleanup, and history/logout suppression
  after completed startup. A Zsh wrapper checks the generated bootstrap syntax
  and simulates a preceding DEBUG trap, redirected `ZDOTDIR`, and a lost report.
- Default and custom-XDG profile lookup through the installer and login shell;
  OpenCode alias arguments; Brew prefix selection and repeated startup with stubs.
- Direct and sourced script selection, help, version, errors, cancellation,
  exact npm arguments, caller history, and shell-state preservation.
- npm-wrapper argument forwarding, failure handling, and real offline package
  install/update/removal through the shared manifest links.
- MCP declaration: `agents/mcp.json` rejects unknown root keys, the rendered files match it,
  and OpenCode accepts the shared file merged with each host profile when
  `opencode` is installed.
- The browser endpoint reader and guarded Playwright examples use the declaration.
  On macOS, the Raycast launcher uses native JSON parsing with no Node or jq on
  its test PATH. Browser calls are stubbed, including failed launches and retries.
- Repository layout against `AGENTS.md`: every path in its tree exists, every
  tracked directory in the first two levels has a row, and no tracked symlink
  is absolute.
- On macOS, installer ordering, reruns, backups, failure recovery, native Node
  selection, and Choosy settings restoration.

Installer tests use temporary homes and stub system-changing commands. The npm
tests use an offline fixture and temporary manifests. These checks do not install
the dotfiles or replace the current machine's application settings.

## Module checks

`check.sh` runs the shared setup checks above. When you change these modules,
also run their documented checks:

- [Claude Code hooks](terminal/claude/hooks/README.md#checks).
- [Eval harness](terminal/bin/eval-harness/README.md#test).
- [Skill eval runner](terminal/bin/skill-evals/README.md#development-checks).
- [Writing eval contracts](agents/skills/blog-post/evals/README.md).

These module checks are not part of the root command or its CI jobs.

Run the focused `testzsh` checks without installing tools or touching your home:

```sh
bash -n terminal/bin/testzsh && bash -n terminal/bin/testzsh.test.sh
shellcheck terminal/bin/testzsh terminal/bin/testzsh.test.sh
shfmt -d -i 2 -ci terminal/bin/testzsh terminal/bin/testzsh.test.sh
/bin/bash terminal/bin/testzsh.test.sh
bash terminal/bin/testzsh.test.sh
```

The tests need Bash, Zsh, and standard Unix tools. They do not need Bun or Node.
Timing checks use broad ranges. A heavily loaded host can exceed those ranges.
They exercise the host's actual system startup files but do not edit them or
prove the behavior of another host's system configuration. For a real startup
check, run `terminal/bin/testzsh`, `terminal/bin/testzsh --profile`, and
`terminal/bin/testzsh --trace`. These commands load your installed configuration
and can update its normal startup caches. See the [command reference](terminal/bin/README.md#measure-zsh-startup)
for the measurement and shutdown boundaries.

## Check on nspawn

nspawn has ShellCheck 0.9, Node, npm, Python 3, Zsh, jq, and rsync, but no `shfmt`
and no `bun`, so `check.sh` cannot run there. Before each commit, copy the
working tree to a scratch directory on nspawn and run the checks that can:

```sh
rsync -a --delete --exclude node_modules --exclude .venv --exclude .cache \
  --exclude .npm --exclude __pycache__ \
  -e 'ssh -o ClearAllForwardings=yes' ./ nspawn:.cache/setup-check/
ssh -o ClearAllForwardings=yes nspawn bash -s <<'EOF'
cd ~/.cache/setup-check
bash terminal/core/test.sh && zsh terminal/core/test.sh
bash terminal/bin/testzsh.test.sh
sh terminal/zsh/tests/agent-link.sh
zsh terminal/zsh/tests/cached-init.zsh
bash terminal/zsh/tests/syntax-selection.sh
zsh terminal/bin/scripts.test.zsh
sh mac/tests/shell-startup.sh
node agents/mcp.ts browser-url
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

After changing `terminal/herdr/`, rerun its installer and confirm that
`herdr plugin list` shows `jhochenbaum.hunkdiff` and `mirror` as enabled. From
an agent pane, press `prefix+shift+r`; a hunk review pane opens beside it. On
the Mac, `herdr-mirror status` lists the `nspawn` host from `mirror-hosts.toml`.

## Changes that need a real smoke test

Tests cannot prove that external apps, downloads, or future package versions work.
After changing installation or app integration, check the affected feature on a
disposable machine or account: run setup, run it again, open a fresh terminal,
and launch the affected app or CLI. Check both ARM64 and x64 when changing native
runtime selection.

After a browser endpoint change, rerun both MCP renderers, restart the tools,
and update the external SSH forward. Launch **Open Brave Agent** from Raycast
and attach with the command in the [MCP guide](agents/README.md#mcp-servers).
The stubbed checks do not prove real browser startup or SSH forwarding.

To make CI a merge gate, configure a GitHub branch ruleset for `main` that requires
both `Check (ubuntu-latest)` and `Check (macos-latest)` and pull requests. The
workflow reports failures on direct pushes but cannot prevent those pushes.
