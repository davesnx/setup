# Context

Terms this repository uses, as the code and docs use them. Use these words. When you add or change a term, update this file in the same change. Paths name where the term is defined.

## Setup

- **module**: A directory with an `install.sh`, a README, and tests wired into `check.sh`. `AGENTS.md` (Rules).
- **installer**: A module's `install.sh`. It links the module's files into place and is safe to rerun. Root `install.sh` runs them in order.
- **link**: A symlink an installer creates from `~` into this repository. The repository copy is the source; never edit the linked copy. `prelude.sh` (`link_path`).
- **backup dir**: One directory per installer run that receives any non-link file an installer replaces. `prelude.sh` (`SETUP_BACKUP_ROOT`).
- **check.sh**: Shared checks. Run before committing. `check.sh`, `TESTING.md`.
- **local override**: Machine-specific setting, git-ignored. `local/*.zsh` is sourced at shell start. `local/README.md`.
- **nspawn**: The Linux host (systemd-nspawn container, `HOME=/home/me`, no Homebrew). Every change must also work there. `AGENTS.md` (Rules).
- **Mac-only**: Anything under `mac/`. Only `mac/` may use `brew`, `open`, `pbcopy`, or `/Applications`. `mac/install.sh`.

## Agents

- **harness**: A coding-agent program that reads this setup: Claude Code or OpenCode. `AGENTS.md` (Rules).
- **host profile**: The per-machine variant, `local` or `ssh`, that selects which MCP servers a harness gets. `agents/mcp.ts`, `terminal/claude/hosts/`, `terminal/opencode/hosts/`.
- **MCP server**: An external tool server declared once in `agents/mcp.json`. `mcp.ts` renders it for each harness and profile. `agents/README.md`.
- **skill**: A directory `agents/skills/<name>/` with a `SKILL.md`. Its tests, evals, and references stay inside it. `agents/skills/`.
- **vendored skill**: A third-party skill copied in, with an `UPSTREAM.md` naming source and revision. Local changes live in git history. `agents/skills/*/UPSTREAM.md`.
- **published skill**: A skill this repository publishes upstream, listed in `agents/skills/VENDOR` and synced by `skill-vendor`. `terminal/bin/skill-vendor`.
- **progressive disclosure**: `SKILL.md` holds the workflow; detail sits in reference files that a "read X when Y" line points to. `agents/skills/writing-for-agents/SKILL.md`.
- **global agent rules**: `agents/AGENTS.md`, linked to each harness's user-level rules file. Not this repository's `AGENTS.md`, which guides work on the repository. `AGENTS.md` (tree).
- **auto-improve**: A Stop hook that starts a detached headless `claude -p` reviewer of the finished session. `terminal/claude/hooks/auto-improve.ts`, `agents/skills/auto-improve/SKILL.md`.
- **auto-improve report**: The reviewer's output file proposing changes to skills, hooks, scripts, or rules. Applying one means resuming the reviewer session. `agents/README.md`, `terminal/claude/hooks/README.md`.

## Evals and tools

- **eval**: A case that checks what an agent does with a skill. Cases live in `agents/skills/<name>/evals/`.
- **eval-harness**: Runner for skill evals, built on a patched `@nano-step/eval-harness`. `terminal/bin/eval-harness/README.md`.
- **skill-evals**: Layered eval pilot on Coder Eval and OpenCode, Python, uv-managed. Reads the same cases. `terminal/bin/skill-evals/README.md`, `MIGRATION.md`.
- **ocs**: Not an eval tool. A picker that opens an OpenCode session in its working directory. `terminal/bin/ocs/`.
- **herdr**: Terminal tool configured by `terminal/herdr/config.toml`. `herdr-mirror` (`mirror-hosts.toml`, Mac only) views remote hosts. `terminal/herdr/README.md`.

## Open questions

- **Eval tool naming.** `ocs`, `eval-harness`, and `skill-evals` sit side by side in `terminal/bin/`. Only the last two are eval tools and they overlap in purpose; `ocs` reads like one. Nothing is renamed. Decide in the Round 2 grill (`.workplace/plans/`, memory note "AGENTS.md grill pending").
