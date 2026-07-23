# Autoresearch Dashboard: zsh-startup

**Runs:** 21 | **Kept:** 5 | **Discarded:** 14 | **Crashed:** 0 | **Checks failed:** 2  
**Baseline:** startup_ms: 107.238 ms (#1)  
**Best:** startup_ms: 71.061 ms (#18, -33.7%)  
**Confidence:** 4.55x (best improvement 36.177 ms / MAD 7.959 ms)

| # | commit | startup_ms | status | description |
|---|--------|------------|--------|-------------|
| 1 | e20a5b9 | 107.238 ms (0.0%) | keep | baseline shows substantial launch jitter above the warm startup floor |
| 2 | e20a5b9 | 96.603 ms (-9.9%) | keep | baseline repeat confirms a roughly 80 ms warm floor and severe outliers |
| 3 | e20a5b9 | 103.505 ms (-3.5%) | discard | deferring generic prompt discovery lowers the floor but not the noisy median |
| 4 | 6851a47 | 92.323 ms (-13.9%) | keep | removing duplicate synchronous zoxide initialization produces a consistent lower floor |
| 5 | 6851a47 | 85.425 ms (-20.3%) | discard | raw wordcode is fast but an unmanaged version-specific artifact is not reproducible |
| 6 | 6851a47 | 224.456 ms (+109.3%) | discard | first managed-wordcode run was dominated by a transient system load spike |
| 7 | 544133f | 88.815 ms (-17.2%) | keep | self-invalidating wordcode retains the speedup without stale-cache behavior |
| 8 | 544133f | 94.083 ms (-12.3%) | checks_failed | direct queue records were correct but the autoload stub left scheduling unavailable |
| 9 | 544133f | 113.994 ms (+6.3%) | checks_failed | sourcing the autoload wrapper directly resolves its plugin path incorrectly |
| 10 | 544133f | 122.458 ms (+14.2%) | discard | direct plugin sourcing and queue construction are slower under load |
| 11 | 544133f | 93.028 ms (-13.2%) | discard | queue batching confirmation remains slower than the public zsh-defer calls |
| 12 | 544133f | 130.545 ms (+21.7%) | discard | wordcode for small Zim sources increases loading overhead under host contention |
| 13 | 544133f | 117.844 ms (+9.9%) | discard | Zim wordcode confirmation remains slower and provides no lower-floor gain |
| 14 | 544133f | 107.842 ms (+0.6%) | discard | removing Zim wordcode restores the prior warm floor despite severe host outliers |
| 15 | 544133f | 104.632 ms (-2.4%) | discard | idle syntax-highlighting load does not improve the median under sustained contention |
| 16 | 544133f | 99.899 ms (-6.8%) | discard | syntax-highlighting deferral confirmation remains above the kept result and warm floor |
| 17 | 544133f | 98.935 ms (-7.7%) | discard | native fnm setup is obscured by a single 820 ms host outlier |
| 18 | 9a29663 | 71.061 ms (-33.7%) | keep | native per-shell fnm symlink removes the dominant subprocess without caching state |
| 19 | 9a29663 | 86.694 ms (-19.2%) | discard | combining fixed fnm exports does not improve wordcode execution |
| 20 | 9a29663 | 99.883 ms (-6.9%) | discard | restored fnm exports pass checks but host contention raises the median |
| 21 | 9a29663 | 91.472 ms (-14.7%) | discard | deriving fnm architecture from CPUTYPE is portable but does not improve the metric |
