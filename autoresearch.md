# Autoresearch: Zsh startup

## Objective
Reduce the wall-clock time required to start an interactive login Zsh while preserving the current shell behavior. The measured workload is equivalent to `testzsh`: `ZSH_BENCHMARK=1 zsh -l -i -c exit`. Each benchmark uses one warm-up followed by 10 measured launches and reports the median.

The working tree already contained uncommitted Zsh changes when this session began. Those changes are part of the behavioral and performance baseline and must not be reverted.

## Metrics
- **Primary**: `startup_ms` (milliseconds, lower is better) - median wall-clock startup time across 10 launches
- **Secondary**: `min_ms`, `max_ms` - observed spread for benchmark diagnosis

## How to Run
`./autoresearch.sh` - validates Zsh syntax, runs one warm-up and 10 measured launches, and outputs `METRIC name=value` lines.

`./autoresearch.checks.sh` - validates syntax and the expected interactive shell contract outside the timed workload.

## Files in Scope
- `terminal/zsh/.zshrc` - interactive shell initialization and deferred work
- `terminal/zsh/.zprofile` - repository-managed login environment (not currently linked from `$HOME`)
- `terminal/zsh/.zimrc` - Zim module declarations used to generate `$HOME/.zim/init.zsh`
- `terminal/zsh/instant-prompt.zsh` - immediate prompt rendering
- `terminal/zsh/themes/prompt_davesnx_setup` - prompt setup
- `terminal/_aliases/*.sh` - sourced aliases and functions, only when startup parsing can be improved without changing definitions
- `terminal/opam-init/*.zsh` and `terminal/opam-init/*.sh` - deferred opam initialization
- `git/forgit.zsh` and `terminal/zsh/fzf-key-bindings.zsh` - deferred integrations
- Autoresearch state and documentation files

## Off Limits
- Files outside the list above
- Generated or installed files under `$HOME`, including `$HOME/.zim/init.zsh` and `$HOME/.zcompdump`
- Installing, removing, or upgrading dependencies
- Removing aliases, completion, hooks, prompt features, environment variables, or tool initialization

## Constraints
- Preserve observable interactive-shell behavior; optimize when work happens or how equivalent state is produced, not which features exist.
- No new dependencies.
- `zsh -n` must pass for all changed shell files.
- `autoresearch.checks.sh` must pass before keeping an experiment.
- Do not overwrite or revert pre-existing working-tree changes.
- Target an order-of-magnitude improvement, but report measured limits honestly if behavior-preserving startup work has a higher floor.

## What's Been Tried
- Baseline already defers autosuggestions, Homebrew shellenv, zoxide, forgit, fzf bindings, direnv, opam, and dune setup through `zsh-defer` for normal interactive shells.
- The benchmark suppresses the custom instant prompt with `ZSH_BENCHMARK=1`; this avoids terminal output affecting the timing.
- `$HOME/.zshrc` links to this repository, while `$HOME/.zprofile` is an unmanaged OrbStack/Elan profile. Therefore `.zprofile` repository edits do not affect the current benchmark.
