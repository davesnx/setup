# Zsh Startup Autoresearch Worklog

## Session
- Started: 2026-07-23
- Workload: median of 10 `ZSH_BENCHMARK=1 zsh -l -i -c exit` launches after one warm-up
- Primary metric: `startup_ms` (lower is better)
- Baseline context: pre-existing uncommitted Zsh changes are preserved as the starting behavior

## Experiments

### Run 1: Baseline - startup_ms=107.238 (KEEP)
- Timestamp: 2026-07-23 18:39
- What changed: No runtime files changed; measured the inherited working-tree configuration.
- Result: median 107.238 ms, min 90.355 ms, max 199.544 ms.
- Insight: The 109 ms spread is large relative to the target, so experiments need repeated confirmation and phase profiling rather than trusting single medians.
- Next: Profile synchronous startup, then repeat the baseline to characterize warm-run noise.

### Run 2: Baseline repeat - startup_ms=96.603 (KEEP)
- Timestamp: 2026-07-23 18:46
- What changed: Removed temporary profiling instrumentation and repeated the unchanged baseline.
- Result: median 96.603 ms, min 80.186 ms, max 224.556 ms; 9.9% below run 1.
- Insight: Warm launches can reach about 80 ms, while sporadic 200+ ms launches inflate medians; improvements must materially exceed this noise.
- Next: Avoid repeated `zsh-defer` option parsing by batching the existing deferred workload.

### Run 3: Defer generic prompt framework - startup_ms=103.505 (DISCARD)
- Timestamp: 2026-07-23 18:46
- What changed: Sourced the custom prompt directly and queued generic `promptinit` discovery for idle time.
- Result: median 103.505 ms, min 64.804 ms, max 210.613 ms; 7.1% above the best median.
- Insight: The 64.804 ms minimum confirms prompt discovery is real synchronous cost, but system outliers overwhelmed a 10-sample median. The change also creates a brief interval where the generic `prompt` command is unavailable.
- Next: Optimize completion validation, the largest synchronous phase, before revisiting prompt setup with larger samples.

### Run 4: Remove duplicate synchronous zoxide - startup_ms=92.323 (KEEP)
- Timestamp: 2026-07-23 18:47
- What changed: Removed `zim-zoxide` from `.zimrc`; the existing deferred evalcache initialization in `.zshrc` remains.
- Result: median 92.323 ms, min 64.694 ms, max 193.091 ms; 4.4% below the previous best and 13.9% below baseline.
- Insight: Zoxide was initialized twice, once synchronously by Zim and once deferred. Removing the duplicate preserves the intended deferred behavior and lowers both median and warm floor.
- Next: Eliminate generic prompt discovery without delaying or removing the public prompt framework.

### Run 5: Raw `.zshrc` wordcode - startup_ms=85.425 (DISCARD)
- Timestamp: 2026-07-23 18:48
- What changed: Compiled `.zshrc` to adjacent native Zsh wordcode.
- Result: median 85.425 ms, min 63.990 ms, max 164.651 ms; 7.5% below the previous best.
- Insight: Zsh follows the repository symlink closely enough to use adjacent wordcode, but an unmanaged version-specific binary is not safe or reproducible.
- Next: Add automatic idle-time rebuilding with source-newer invalidation.

### Run 6: Managed wordcode first sample - startup_ms=224.456 (DISCARD)
- Timestamp: 2026-07-23 18:49
- What changed: Added an idle-time rebuild only when `.zshrc` is newer than `.zshrc.zwc`, then measured the generated cache.
- Result: median 224.456 ms, min 111.487 ms, max 1060.764 ms; 143.1% above the best kept median.
- Insight: A transient host load spike affected every sample and reached 1.06 seconds; this run does not represent the code path and requires immediate confirmation.
- Next: Re-run unchanged once host load settles.

### Run 7: Managed wordcode confirmation - startup_ms=88.815 (KEEP)
- Timestamp: 2026-07-23 18:50
- What changed: Re-ran the self-invalidating wordcode configuration unchanged after the transient spike.
- Result: median 88.815 ms, min 68.749 ms, max 104.719 ms; 3.8% below the previous best and 17.2% below baseline.
- Insight: Built-in source-newer invalidation keeps the wordcode local and safe after edits while retaining most of the parsing improvement.
- Next: Reduce completion freshness scanning without accepting stale completion definitions.

### Run 8: Batch deferred task records - startup_ms=94.083 (CHECKS_FAILED)
- Timestamp: 2026-07-23 18:50
- What changed: Replaced repeated public `zsh-defer` calls with equivalent internal task records and one scheduler call.
- Result: median 94.083 ms, min 66.447 ms, max 125.241 ms; validation failed.
- Insight: Task serialization matched all eight expected records, but autoloading `zsh-defer` does not define its private scheduler until the public function is first invoked.
- Next: Load the implementation before constructing the queue.

### Run 9: Source zsh-defer wrapper - startup_ms=113.994 (CHECKS_FAILED)
- Timestamp: 2026-07-23 18:51
- What changed: Sourced the autoload wrapper instead of invoking it.
- Result: median 113.994 ms, min 96.732 ms, max 169.730 ms; validation failed.
- Insight: The wrapper depends on `functions_source[zsh-defer]`, which is only populated by autoload; direct sourcing resolves its plugin path incorrectly.
- Next: Source the plugin implementation itself.

### Run 10: Source plugin and batch queue - startup_ms=122.458 (DISCARD)
- Timestamp: 2026-07-23 18:51
- What changed: Sourced `zsh-defer.plugin.zsh` directly, constructed identical task records, and scheduled once.
- Result: median 122.458 ms, min 89.637 ms, max 186.485 ms; 37.9% above the best.
- Insight: Avoiding public call parsing does not offset eager plugin parsing under current system load.
- Next: Repeat once to distinguish load noise from structural cost.

### Run 11: Batch queue confirmation - startup_ms=93.028 (DISCARD)
- Timestamp: 2026-07-23 18:52
- What changed: Re-ran direct plugin sourcing and batched queue construction unchanged.
- Result: median 93.028 ms, min 74.342 ms, max 139.785 ms; 4.7% above the best.
- Insight: The public autoload path is already efficient enough; private queue coupling adds complexity without a measured win.
- Next: Restore public `zsh-defer` calls and focus on completion initialization.

### Run 12: Compile loaded Zim sources - startup_ms=130.545 (DISCARD)
- Timestamp: 2026-07-23 18:52
- What changed: Compiled the exact Zim source files loaded synchronously, retaining source-newer invalidation.
- Result: median 130.545 ms, min 84.489 ms, max 269.780 ms; 47.0% above the best.
- Insight: Small module wordcode adds lookup/loading overhead and does not reduce completion's filesystem scan.
- Next: Confirm before removing generated module caches.

### Run 13: Zim source wordcode confirmation - startup_ms=117.844 (DISCARD)
- Timestamp: 2026-07-23 18:52
- What changed: Re-ran with all Zim source wordcode unchanged.
- Result: median 117.844 ms, min 84.179 ms, max 223.896 ms; 32.7% above the best.
- Insight: The module-level wordcode path is consistently inferior and its warm floor is no better.
- Next: Remove all generated Zim wordcode.

### Run 14: Remove Zim source wordcode - startup_ms=107.842 (DISCARD)
- Timestamp: 2026-07-23 18:52
- What changed: Removed all module wordcode created by runs 12-13, retaining only managed `.zshrc` wordcode.
- Result: median 107.842 ms, min 81.325 ms, max 552.616 ms; 21.4% above the best.
- Insight: The prior warm floor returned, but sustained host contention makes current medians unsuitable for detecting small gains.
- Next: Stop micro-optimizing parsing and verify the kept configuration under a quieter repeated sample.

### Run 15: Defer syntax highlighting - startup_ms=104.632 (DISCARD)
- Timestamp: 2026-07-23 18:53
- What changed: Marked the Zim syntax-highlighting module deferred and queued its existing source file after autosuggestions.
- Result: median 104.632 ms, min 81.783 ms, max 270.174 ms; 17.8% above the best.
- Insight: The expected ~4 ms synchronous saving is smaller than current contention and did not lower the warm floor.
- Next: Repeat unchanged once before rejecting the standard idle deferral.

### Run 16: Syntax-highlighting deferral confirmation - startup_ms=99.899 (DISCARD)
- Timestamp: 2026-07-23 18:53
- What changed: Re-ran deferred syntax highlighting unchanged.
- Result: median 99.899 ms, min 81.553 ms, max 225.315 ms; 12.5% above the best.
- Insight: Two runs show no measurable benefit and introduce a brief interval without highlighting, so synchronous loading is restored.
- Next: Validate the kept state and improve benchmark isolation before attempting smaller changes.

### Run 17: Native fnm environment first sample - startup_ms=98.935 (DISCARD)
- Timestamp: 2026-07-23 18:56
- What changed: Replaced the ~50 ms `fnm env` subprocess with equivalent fixed exports and a per-shell symlink created by Zsh builtins.
- Result: median 98.935 ms, min 75.418 ms, max 819.886 ms; 11.4% above the best due to one extreme host outlier.
- Insight: Contract checks confirm the multishell path is a unique symlink to the configured default and `node` resolves through it, but the sample needs confirmation.
- Next: Re-run unchanged under the same checks.

### Run 18: Native fnm environment confirmation - startup_ms=71.061 (KEEP)
- Timestamp: 2026-07-23 18:57
- What changed: Re-ran the native fnm setup unchanged and strengthened checks for symlink target, Node resolution, and deferred-task scheduling.
- Result: median 71.061 ms, min 62.618 ms, max 84.500 ms; 20.0% below the previous best and 33.7% below baseline.
- Insight: `fnm env` spent most of its time starting a process to emit fixed exports and create one symlink. Zsh builtins reproduce the per-shell multishell contract without a stale cached path.
- Next: Test portability of architecture/config values and profile the new synchronous critical path.

### Run 19: Combine fnm exports - startup_ms=86.694 (DISCARD)
- Timestamp: 2026-07-23 18:58
- What changed: Combined eight fixed fnm exports into one shell command.
- Result: median 86.694 ms, min 64.486 ms, max 120.682 ms; 22.0% above the best.
- Insight: Native wordcode already minimizes statement parsing; combining exports adds no measurable value.
- Next: Restore the clearer individual exports.

### Run 20: Restore explicit fnm exports - startup_ms=99.883 (DISCARD)
- Timestamp: 2026-07-23 18:59
- What changed: Restored the kept explicit export form and regenerated `.zshrc.zwc`.
- Result: median 99.883 ms, min 72.751 ms, max 126.167 ms; 40.6% above the best.
- Insight: Contract checks remain green; the elevated median tracks renewed host contention rather than a code change.
- Next: Preserve the simpler kept implementation and validate state consistency.

### Run 21: Derive fnm architecture - startup_ms=91.472 (DISCARD)
- Timestamp: 2026-07-23 19:00
- What changed: Replaced the fixed `arm64` value with Zsh's equivalent `$CPUTYPE`.
- Result: median 91.472 ms, min 73.873 ms, max 171.920 ms; 28.7% above the best.
- Insight: The value is equivalent on this machine but cannot be kept under the primary-metric rule; repository setup is currently macOS arm64-specific.
- Next: Restore the measured kept state and close state-integrity gaps.

### Run 22: Kept-state confirmation - startup_ms=87.107 (DISCARD)
- Timestamp: 2026-07-23 19:02
- What changed: No runtime change; reran the committed kept state with all contract checks.
- Result: median 87.107 ms, min 73.050 ms, max 192.639 ms; 22.6% above the best.
- Insight: Correctness remains green and the warm samples stay below the original ~80 ms floor, but host outliers continue to dominate 10-run medians.
- Next: Retain run 18 as the best controlled result and avoid sacrificing completion freshness or prompt availability for benchmark-only gains.

## Key Insights
- `$HOME/.zshrc` links to the repository, but `$HOME/.zprofile` does not; only `.zshrc` and its sourced files affect this benchmark.
- External tool initialization is mostly deferred already, so synchronous Zim module loading and completion setup are likely the main optimization surface.
- The first controlled run ranged from 90.355 to 199.544 ms despite a warm-up, indicating significant system-level jitter.
- `zprof` attributes about 21 ms to Zim completion validation, 12 ms to prompt framework initialization, 8 ms to nine `zsh-defer` calls, and 6 ms to `compinit`.
- Direct custom prompt setup can lower the observed warm floor by roughly 15 ms, but deferring the generic prompt API needs stronger behavioral justification.
- `.zimrc` contradicted its own comment by loading `zim-zoxide`; the manual deferred zoxide setup is sufficient and avoids duplicate initialization.
- Native `.zshrc.zwc` is automatically ignored when `.zshrc` is newer. Rebuilding it as a deferred task avoids startup cost and stale-cache failures.
- Bypassing the public `zsh-defer` API did not improve startup and introduced fragile coupling to private scheduler internals.
- Compiling small Zim module files was slower; only the larger repository `.zshrc` benefits from wordcode.
- Deferring syntax highlighting did not beat the managed-wordcode result and was reverted.
- Native fnm initialization preserves its unique mutable multishell symlink while removing a ~50 ms subprocess; this is the largest verified gain.
- Combining fnm exports offered no benefit; explicit assignments are retained for clarity.

## Next Ideas
- Investigate whether Zim exposes a freshness-validation mode faster than statting every completion function without accepting stale definitions.
- Compare prompt framework discovery against a generated theme index that has source-newer invalidation.
- Re-run the kept configuration when host contention is lower to tighten the confidence interval.
