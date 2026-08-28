# Plan 001: Preserve an explicit zero retry delay

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `abc1234`, 2026-08-28

## Why this matters

The current fallback replaces an explicit zero delay with 1000 ms. Tests and
the implementation must preserve zero while retaining the default for absent
values.

## Current state

- `src/retry-policy.mjs` uses `Number(config.retryDelayMs) || 1000`.

## Scope

**In scope**:
- `src/retry-policy.mjs`
- `test/retry-policy.test.mjs`

**Out of scope**:
- Retry scheduling and attempt-count behavior.

## Steps

1. Add a failing test for an explicit zero delay.
2. Replace the truthy fallback with a nullish default.
3. Run the focused and repository checks.

## Test plan

- `node --test test/retry-policy.test.mjs` must pass.

## Done criteria

- [ ] The focused test exits 0.
- [ ] Zero remains zero.
- [ ] Missing values use 1000 ms.
- [ ] No source files outside Scope change.

## STOP conditions

- Stop if the fix requires a change to retry scheduling.
- Stop if the live source does not match Current state.
