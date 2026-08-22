---
name: tdd
description: Use only when the user explicitly asks for TDD, test-first implementation, red-green-refactor, integration tests, domain modeling, ubiquitous language, glossary or CONTEXT.md work, or an ADR. Do not load for a generic implementation request, spec, ticket, or bug fix.
---

# TDD

## Modes

- **Red-green-refactor**: Build behavior test-first through agreed seams.
- **Implement**: When the user explicitly asks to implement a spec or ticket with TDD, read [references/implement.md](references/implement.md), then deliver it through vertical TDD slices and validation.
- **Domain modeling**: Sharpen domain language, test concepts with scenarios, maintain `CONTEXT.md`, and record qualifying ADRs. Read [references/domain-modeling.md](references/domain-modeling.md) before starting.

Use both modes when test design exposes unclear domain concepts. Resolve the language and scenarios first, then name tests and interfaces with the settled vocabulary.

## Red-Green-Refactor

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

When exploring the codebase, check `CONTEXT-MAP.md` first. Read the mapped `CONTEXT.md` and ADRs for the area, or the root context when no map exists, so test names and interface vocabulary match the project's domain language.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the location where a module's interface lives and behavior can be observed or substituted without editing that location. Tests exercise behavior through the interface at the seam, not through implementation details.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything — agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?"

When the shape of that interface is itself in question, agree on the seam with the user before continuing. Do not broaden TDD into architecture work unless the user explicitly asks for it.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, exactly one new failing behavior test, and one minimal implementation per cycle. Do not batch several tests or assertions into one RED phase. Keep later examples in a backlog until their cycle starts.
- **Refactor after green.** Improve names, duplication, interfaces, and structure only while the tests stay green. Do not add behavior during refactoring. After the full set of slices, review the changed behavior and tests directly. Load `code-review` only when the user asks for a code review.
