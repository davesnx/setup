# setup

Personal machine setup: dotfiles, installers, and agent configuration.

## Layout

- `install.sh`: preflight checks, then one call per folder installer.
- `prelude.sh`: sourced first by every installer. It sets `-eu`, one backup
  directory per run, and the `need`, `link_path`, and `link_path_guarded`
  helpers.
- `agents/`: shared agent rules and skills (`AGENTS.md`, `skills/`), linked
  into `~/.agents`.
- `git/`: Git configuration (`.gitconfig`, `.gitignore_global`,
  `.gitattributes`).
- `local/`: machine-specific overrides. Only `install.sh`, `main.sh`, and
  `README.md` are tracked.
- `mac/`: macOS-only setup (Homebrew, editors, Ghostty), with `daemons/`
  (launchd agents), `enpass/` (the Enpass CLI wrapper), and `tests/` (the
  installer test suite).
- `ssh/`: the SSH config fragment that opens links from a remote host on
  this machine.
- `terminal/`: shell tools, with `bin/` (scripts and their tests), `claude/`
  (Claude Code config), `opencode/` (OpenCode config), `zsh/`, `tmux/`, and
  `htop/`.

## Conventions

- `<folder>/install.sh` runs install-time steps for that folder only. It
  computes `setup_path`, sources `prelude.sh`, then does its work. Root
  `install.sh` calls each one with no arguments.
- `<folder>/main.sh` is zsh, sourced at every shell start, never executed.
  `.zprofile` sources the ones that set environment and PATH: `mac`,
  `terminal/bin`, `mac/enpass`, `terminal/opencode`. `.zshrc` sources the ones
  that define aliases and functions: `terminal/_aliases`, `agents`, `git`,
  `local`. `terminal/core/main.sh` is the bash library that the `terminal/bin`
  scripts source; the shell does not load it.
- An installer owns every link inside its destination directory. Removing a
  folder then removes its links with it.
- Root `install.sh` calls installers in this order: mac (Darwin only), git,
  local, ssh, terminal/zsh, terminal/tmux, terminal/htop, agents,
  terminal/claude, terminal/opencode, terminal/bin/eval-harness. Agents runs
  before its two consumers because `link_path` requires an existing source.
