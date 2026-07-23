# Zsh Startup Autoresearch Worklog

## Session
- Started: 2026-07-23
- Workload: median of 10 `ZSH_BENCHMARK=1 zsh -l -i -c exit` launches after one warm-up
- Primary metric: `startup_ms` (lower is better)
- Baseline context: pre-existing uncommitted Zsh changes are preserved as the starting behavior

## Experiments

## Key Insights
- `$HOME/.zshrc` links to the repository, but `$HOME/.zprofile` does not; only `.zshrc` and its sourced files affect this benchmark.
- External tool initialization is mostly deferred already, so synchronous Zim module loading and completion setup are likely the main optimization surface.

## Next Ideas
- Profile synchronous Zim modules with `zprof` to identify the actual startup floor.
- Test whether completion security scanning or dump validation can be safely avoided without changing completion behavior.
- Test native Zsh wordcode for stable, repository-owned source files without relying on fragile stale caches.
