# setup

Personal machine setup: dotfiles, installers, and agent configuration.

## Layout

- `install.sh`: preflight checks, then one call per folder installer.
- `link.sh`: shared helper (`link_path SOURCE TARGET`) used by every installer.
- `agents/`: shared agent rules and skills (`AGENTS.md`, `skills/`), linked
  into `~/.agents`.
- `git/`: Git configuration (`.gitconfig`, `.gitignore_global`,
  `.gitattributes`).
- `local/`: machine-specific overrides. Only `main.sh` and `README.md` are
  tracked.
- `mac/`: macOS-only setup (Homebrew, editors, Ghostty), with `daemons/`
  (launchd agents), `enpass/` (the Enpass CLI wrapper), and `tests/` (the
  installer test suite).
- `ssh/`: the SSH config fragment that opens links from a remote host on
  this machine.
- `terminal/`: shell tools, with `bin/` (scripts and their tests), `claude/`
  (Claude Code config), `opencode/` (OpenCode config), `zsh/`, `tmux/`, and
  `htop/`.

## Conventions

- `<folder>/install.sh` runs install-time steps for that folder only. Root
  `install.sh` calls each one with no arguments.
- `<folder>/main.sh` runs shell-start steps for that folder. `.zshrc` sources
  it. Only `local/main.sh` exists.
- An installer owns every link inside its destination directory. Removing a
  folder then removes its links with it.
- Root `install.sh` calls installers in this order: mac (Darwin only), git,
  ssh, terminal/zsh, terminal/tmux, terminal/htop, agents, terminal/claude,
  terminal/opencode, terminal/bin/eval-harness. Agents runs before its two
  consumers because `link_path` requires an existing source.
