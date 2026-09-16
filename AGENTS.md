# Setup repository

Dotfiles for the Mac and the nspawn host. The repository is self-contained:
every global setting a machine needs lives here, and a module `install.sh`
links it into place. Edit the source here and rerun that installer. Never edit
the linked copy under `~`, and never let another tool write through a link into
this repository.

## Where things go

Before you create a file or directory, find its row in this tree and name the
target path in your reply. If no row fits, ask before creating a directory in
the first two levels. `->` names the link an installer creates.

```text
install.sh                Full machine setup. Runs each module install.sh in order.
prelude.sh                Installer helpers: need, link_path, one backup dir per run.
check.sh                  Every repository check. Run before committing. See TESTING.md.
shellcheck.sh             ShellCheck and Zsh syntax pass, called by check.sh.
TESTING.md                What check.sh covers, and what needs a real smoke test.
CLAUDE.md                 One line, @AGENTS.md. Claude Code does not read AGENTS.md.
.github/workflows/check.yml  CI. Runs check.sh on Linux and macOS.

agents/                   Shared by Claude Code and OpenCode: rules, skills, MCP.
agents/AGENTS.md          Global agent rules -> ~/.claude/CLAUDE.md, ~/.agents/AGENTS.md,
                          ~/.config/opencode/AGENTS.md
agents/skills/            The only skills directory -> ~/.claude/skills, ~/.agents/skills.
                          One directory per skill with SKILL.md. Its tests, evals, and
                          references stay inside it. Third-party skills carry UPSTREAM.md.
agents/skills/VENDOR      Skills published upstream from here, managed by skill-vendor.
agents/skills/.skill-lock.json  Versions of skills installed with npx skills -> ~/.agents/
agents/mcp.json           Every MCP server once, in the common format. Never linked.
agents/mcp.ts             Reads and validates mcp.json for the two renderers below.
agents/main.sh            npx skills wrapper, sourced at shell start.
agents/README.md          MCP details.

terminal/                 Shell and CLI tools. Mac and nspawn.
terminal/zsh/             .zshenv .zshrc .zprofile .zimrc -> ~/. .zshrc sources every main.sh.
terminal/core/            Shell helpers for scripts: args, log, platform, collections.
terminal/_aliases/        Aliases and shell functions.
terminal/bin/             Commands on PATH. Extensionless, ShellCheck clean, test beside them.
                          Skill eval tooling lives here too, each tool in its own directory.
terminal/bin/git-extras/  git-<name> subcommands and their test.sh.
terminal/bin/eval-harness/  Skill eval runner on @nano-step/eval-harness. Cases stay with skills.
terminal/bin/skill-evals/  Skill evaluation pilot on Coder Eval. Python, uv-managed, own README
                          and unittest suite. Cases stay in agents/skills/<name>/evals.
terminal/node/            Node via fnm and shared CLIs in package.json. npm i -g writes here.
                          Never add Node tools to the Brewfile.
terminal/claude/          Claude Code only. settings.json -> ~/.claude/settings.json,
                          hooks/, statusline.ts. mcp.ts renders hosts/<profile>.json, the
                          machine's profile -> ~/.mcp.json.
terminal/opencode/        OpenCode only -> ~/.config/opencode. opencode.jsonc, agents/,
                          hosts/, themes/, vendor/ for whole third-party plugins, and
                          skills/ only for skills whose names clash with Claude built-ins.
                          mcp.ts renders mcp.json -> ~/.config/opencode/opencode.json
                          and hosts/*.jsonc, the per-machine profile -> host.jsonc.
terminal/tmux/            .tmux.conf -> ~/.tmux.conf
terminal/herdr/           config.toml -> ~/.config/herdr/config.toml
terminal/htop/            htoprc -> ~/.config/htop/htoprc

mac/                      macOS only. install.sh: Homebrew, defaults, apps, daemons.
mac/brew/Brewfile         Homebrew packages, casks, taps.
mac/mac-os.sh             macOS defaults.
mac/raycast/              Raycast scripts and the extension checklist.
mac/tampermonkey/         Browser userscripts and their TypeScript manager.
mac/choosy/               Browser chooser settings and test.
mac/ghostty/              config.conf -> ~/.config/ghostty/config
mac/editors/              vscode/ -> ~/Library/Application Support/{Code,Cursor}/User,
                          zed/ -> ~/.config/zed
mac/daemons/              launchd plists -> ~/Library/LaunchAgents
mac/enpass/               Enpass CLI wrapper in bin/ and its test.
mac/fonts/                Font files.
mac/gnupg/                gpg-agent.conf -> ~/.gnupg/gpg-agent.conf
mac/tests/                Installer regression tests. check.sh runs them on macOS.
mac/chrome-extensions.md  Browser extension list.
mac/vimium-options.json   Vimium settings.

git/                      .gitconfig .gitignore_global .gitattributes -> ~/. forgit.zsh.
ssh/nspawn.conf           SSH config for the nspawn host. Not linked by an installer.
local/                    Machine-specific overrides. Git-ignored except README, install.sh,
                          main.sh. *.zsh files are sourced at shell start. local/bin holds
                          machine-only commands.
```

## Rules

- `agents/` is shared by both harnesses. `terminal/claude/` is Claude Code
  only. `terminal/opencode/` is OpenCode only. Do not move a file across these
  three because one harness wanted it. Put it where both can reach it.
- A new skill is `agents/skills/<name>/SKILL.md`. Its tests, evals, and
  references live in that directory. Vendor third-party skills and plugins in
  this repository with an `UPSTREAM.md`. Global configuration folders only link
  to this repository.
- MCP servers are declared in `agents/mcp.json` only, per-machine differences
  under its `hosts` key. After editing it, run `node terminal/claude/mcp.ts`
  and `node terminal/opencode/mcp.ts`, and commit the rendered files with it.
  Claude Code runs both on edit through a hook.
- Plans go in `.workplace/plans/<name>_PLAN.md`. The global Git ignore file
  excludes `.workplace/` everywhere.
- A new module is a directory with `install.sh` called from the root
  `install.sh`, a README, and tests wired into `check.sh`. Add `main.sh` only
  when it must run at every shell start, and source it from
  `terminal/zsh/.zshrc`.
- Keep credentials and machine state out of Git. Machine-specific settings go
  in `local/`.
- The repository also runs on nspawn: Linux, `HOME=/home/me`, checkout at
  `/home/me/workplace/davesnx/setup`, no Homebrew, no `bun`, no `shfmt`, and
  Puppet owns `~/.claude/hooks/dcg`. Before each commit, confirm the change
  works there: no `/Users/`, `/opt/homebrew`, or `/Applications` path and no
  Mac-only command such as `brew`, `open`, `pbcopy`, or `trash` outside `mac/`.
  Then run the nspawn checks described in TESTING.md.
- Run `bash check.sh` before committing. It also checks this file: every path
  in the tree exists, every tracked directory in the first two levels has a
  row, and no tracked symlink is absolute.
