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
- On macOS, installer ordering, reruns, backups, failure recovery, native Node
  selection, and Choosy settings restoration.

Installer tests use temporary homes and stub system-changing commands. The npm
tests use an offline fixture and temporary manifests. These checks do not install
the dotfiles or replace the current machine's application settings.

## Changes that need a real smoke test

Tests cannot prove that external apps, downloads, or future package versions work.
After changing installation or app integration, check the affected feature on a
disposable machine or account: run setup, run it again, open a fresh terminal,
and launch the affected app or CLI. Check both ARM64 and x64 when changing native
runtime selection.

To make CI a merge gate, configure a GitHub branch ruleset for `main` that requires
both `Check (ubuntu-latest)` and `Check (macos-latest)` and pull requests. The
workflow reports failures on direct pushes but cannot prevent those pushes.
