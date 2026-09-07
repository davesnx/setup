---
name: code-standards
description: "Shared code quality bar for complexity, boundaries, failures, state and type models, modules, tests, and operations. Load when a change alters one of those areas, or when simplify or code-review needs the shared standards."
---

# Code standards

Use these standards when the task touches their subject. Apply them to new and
refactored behavior. Keep unrelated old code unchanged.

## Decision order

1. Preserve correctness, safety, and the ability to diagnose failures.
2. Meet the requested behavior and public contract.
3. Follow compatible repository architecture and conventions.
4. Contain incompatible old patterns at the nearest boundary.
5. Prefer the solution with less owned complexity.

## Complexity

- Keep architecture proportional to the real problem. Start with the smallest
  honest implementation of the use case, often a direct script or one vertical
  slice.
- Judge an abstraction by total system cost: lines, interfaces, files, call
  hops, configuration, tests, and the concepts a reader must learn. Ten obvious
  lines spread over five files is negative value.
- Make code usable before reusable. Extract a helper, port, service, or module
  only after real examples expose the shared shape, or when it owns a real
  invariant, hides real complexity, or has several real implementations.
- Duplication is cheaper than the wrong abstraction (Sandi Metz). Constrain
  first, generalize later.
- After correctness, intention, and duplication, prefer the fewest classes,
  functions, and names.
- A pattern name is vocabulary for a design that emerged, not a requirement to
  manufacture that design.
- Keep behavior local. A reader learns what a unit does by reading it, not by
  searching distant files.
- Prefer one obvious path and one source of truth.
- Add a guard, fallback, retry, or race handling only for a failure that a
  runtime, log, test reproduction, persisted state, or user report proved. Fix
  the smallest real failure at the boundary that owns it. One incident does
  not justify a general defense system.
- Justify complexity with an observed failure and its likelihood, never with
  "could", "might", or "what if" alone.
- Change internal call sites rather than preserve a bad interface.
- Prefer less code, fewer names, fewer branches, and net-negative diffs when
  behavior permits. Remove a branch, helper, mode, or layer rather than
  rearrange it.

## Cyclomatic complexity

- Cyclomatic complexity counts linearly independent paths through a function's
  control flow, not all execution paths.
- Start at 1. Each binary decision adds 1: `if`, `else if`, conditional loops,
  and ternary expressions. An unconditional `else` adds nothing.
- A decision with N distinct outgoing branches adds N - 1. Counting conventions
  differ for case labels, exception handlers, and short-circuit expressions
  such as `&&` and `||`. Compare scores only under the same convention.
- Use project limits. Otherwise: 1-5 low, 6-10 moderate, 11-15 high, 16+ very
  high. These are review guides, not quality ratings.
- Cyclomatic complexity adds no penalty for nesting. Cognitive complexity
  estimates how hard control flow is to read and penalizes nesting. Keep the
  scores separate.
- Neither score proves correctness, readability, or adequate testing. Neither
  measures runtime cost or total system complexity, or sets a required test
  count. Equal scores do not imply equal maintenance cost or defect risk.
- Consider branch meaning and interactions, input values, state, failure
  behavior, and infeasible paths alongside the count.

## Boundaries and safety

- Don't lie to the type system. When the compiler can't prove a fact, prove it:
  validate, narrow, or refine the model. A cast that remains needs a `SAFETY`
  comment that states what was checked and who guarantees it.
- Turn unknown or weakly structured input into trusted application values at the
  earliest useful boundary. Keep what parsing learned instead of validating and
  discarding it.
- Keep framework, protocol, database, runtime, and vendor values inside the
  boundary that owns them. Pass application or domain values inward.
- Inbound boundaries verify credentials and produce a parsed identity. Pure
  permission decisions live with the domain values. Application code enforces
  them while it runs the operation. Boundaries project denials into protocol
  outcomes and never define permission policy.
- Catch and classify unknown dependency failures at the owning boundary. Map
  internal outcomes to valid responses, exit codes, retry decisions, or startup
  errors at the outer boundary.
- Preserve existing logs, traces, metrics, and error reporting. Record safe
  structured context such as operation names, identifiers, dependency names,
  state, retries, and error categories.
- Keep secrets and raw credentials out of errors, logs, traces, and snapshots.
  Expose a sensitive raw value only where the external call needs it.
- Treat invalid configuration as a clear startup failure.
- Read configuration once at startup and pass typed values inward.

## Functions

- Show the happy path first. Guards leave early, the valid path stays flat and
  linear, and the common case gets most of the code a reader sees.
- A function should tell one story at one level of abstraction
- `let` bindings are sentences. Order them like you'd narrate them.
- The caller reads the headline; the callee owns the paragraph.
- Comments explain why; names explain what; the body should rarely need to explain how.
- Good code is boring to read — surprise is a code smell.
- Push side effects to the edges; keep the core pure
- Composition beats inheritance; functions compose better than objects.
- What you can't express as a value, you can't test.
- Errors are values, always.

## Modules and dependencies

- Things that change together, should stay together.
- Things that change at different rates should be separated.
- Classify code by what would make it change: a business rule, an application
  policy or effect order, a technology translation, or wiring. Split a unit
  when it owns more than one reason, never to satisfy a taxonomy.
- A good interface makes the wrong call look wrong.
- Modules exist to hide decisions, not code.
- Use composition over inheritance.
- Build cohesive modules that hide meaningful behavior, policy, sequencing, or
  translation behind a small caller burden.
- Apply the deletion test. If deleting a module makes complexity disappear, it
  was pass-through waste. If deleting it spreads complexity across callers, it
  earned its keep.
- Keep interfaces narrow and expressed in the caller's terms.
- Reuse an existing integration first. Extend it when the new work belongs to
  the same capability. Create a new one only when reuse would mix ownership.
- Remove modules that only forward calls, rename another API, or mirror storage
  without hiding useful complexity.
- Reuse the codebase's canonical helper instead of writing a near-duplicate.
- Parallelize independent work only when it also makes the orchestration
  clearer, not by default.
- Keep deterministic rules independent of I/O, frameworks, mutable global
  state, ambient time, and randomness. Pass required capabilities explicitly.
- Export the supported public surface and keep implementation details private.

## State and data

- Make illegal states unrepresentable
- Use dedicated domain values when raw identifiers, units, or parsed strings can be confused.
- Model meaningful lifecycle states explicitly instead of combining flags and
  optional fields that permit impossible states.
- Prefer named options or domain values over boolean arguments that change
  behavior.
- Use explicit operation inputs instead of generic partial records unless
  partiality is the domain concept.
- Resolve absence before calling code that requires a value. Keep mutable state
  local, intentional, and hidden behind a precise interface. Avoid mutable global
  state.
- Question unnecessary `any`, `unknown`, casts, and optional fields that hide
  the real invariant.
- Make related state updates atomic when a partial update would leave an
  unsafe or confusing state.

## Failures

- Match the repository's established error model. Do not introduce a result
  framework into an exception-based codebase only to satisfy this skill.
- Make expected failures clear in the public contract through return values,
  declared errors, documented outcomes, or the repository's equivalent.
- Keep failure categories precise at module boundaries. Include useful context
  and an underlying cause without leaking sensitive data.
- Reserve panic-style failures for broken internal invariants and impossible
  states when that distinction matches the language and repository.
- Do not silence failures with casts, ignored errors, broad catches, or fallback
  values that change meaning.

## Domain modeling with types

- The type signature is the domain document. If the domain expert can't read it, the model is wrong.
- Use the ubiquitous language in code — OrderId, not int; ValidatedOrder, not Order with a flag.
- Wrap every primitive that means something. Primitive obsession is where domain bugs hide.
- Model choices as sum types, not as booleans or nullable fields.
- States that differ in shape deserve different types, not one type with optional fields.
- Constraints are types: EmailAddress, NonEmptyString, Quantity between 1 and 1000 — enforced at construction, trusted after.
- The constructor is the gate. Smart constructors return Result, and the type is proof the check happened.
- Name construction by what it does: `parse` turns untrusted input into a
  result, `make` builds from already-typed pieces, `is` is a plain predicate. A
  function that returns a refined value parsed something, so do not call it
  `validate`.
- Design the types with the domain expert first, then write functions. Code that compiles against wrong types is still wrong.

## Tests

- Prefer confidence in this order when practical: tests through real public
  entrypoints, integration tests through real seams, property tests for pure
  rules, then focused unit tests.
- Do not add logic in tests.
- Test observable behavior such as returned outcomes, stored state, emitted
  messages, rendered responses, or recorded external actions.
- Prefer real seams, local substitutes, or explicit fake integrations over
  module mocks and tests driven mainly by spies.
- Use a real local database when schema, query, or transaction behavior matters.
- Construct test data through the same valid paths used by production code.
- Follow the repository's test tools and conventions. Add the smallest test set
  that proves the changed behavior and important edge cases.

## Operations

- Retry a technical failure only when the operation is safely repeatable and the
  retry preserves its meaning.
- The boundary that owns the external call retries short technical failures.
  Application code decides whether to attempt the operation again. Durable
  workflows own retries that must survive a crash, a delay, or redelivery.
- Give retryable external mutations an explicit idempotency method, such as a
  unique key, deduplication record, guarded state transition, or transactional
  message pattern.
- Do not keep a database transaction open across network calls or long-running
  work.
- Use durable workflow machinery only when progress must survive process loss,
  redelivery, long delays, compensation, human approval, or several transaction
  boundaries.
- Avoid load-time I/O outside true bootstrap code. Make resource creation and
  cleanup explicit.
