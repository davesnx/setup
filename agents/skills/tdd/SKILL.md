---
name: tdd
description: Use for explicit TDD, test-first, or red-green-refactor requests, including test-first integration tests. Not for generic implementation, bug fixes, tests alone, or domain artifacts. Load domain-modeling too only when explicitly requested.
---

# TDD

## Modes

- **Red-green-refactor**: Build behavior test-first through agreed seams.
- **Implement**: When the user explicitly asks to implement a spec or ticket with TDD, read [references/implement.md](references/implement.md), then deliver it through vertical TDD slices and validation.

When unclear domain language, boundaries, or a hard-to-reverse decision blocks test-first work, mention `domain-modeling` as an optional supporting skill instead of loading it. Load it only when the user also asks to resolve the domain model, language, context map, or decision record.

## Red-Green-Refactor

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the location where a module's interface lives and behavior can be observed or substituted without editing that location. Tests exercise behavior through the interface at the seam, not through implementation details.

Use the user-specified or already agreed public interface. Check existing code and tests to locate it; state the interface under test and proceed without asking for approval again.

Ask only when a material interface decision remains unresolved after checking the request, prior agreement, and code. Do not broaden TDD into architecture work unless the user explicitly asks for it.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write and run the test; confirm it fails for the missing behavior before writing only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one new failing behavior test, and one minimal implementation per cycle. Multiple assertions can establish that single behavior. Keep separate behaviors and later examples in a backlog until their cycle starts.
- **Refactor after green.** Improve names, duplication, interfaces, and structure only while the tests stay green. Do not add behavior during refactoring. After the full set of slices, review the changed behavior and tests directly. Load `code-review` only when the user asks for a code review.
