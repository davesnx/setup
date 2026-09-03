# General software standards

Use these standards when the task touches their subject. Apply them to new and
refactored behavior. Keep unrelated old code unchanged.

## Decision order

1. Preserve correctness, safety, and the ability to diagnose failures.
2. Meet the requested behavior and public contract.
3. Follow compatible repository architecture and conventions.
4. Contain incompatible old patterns at the nearest boundary.
5. Prefer the solution with less owned complexity.

## Boundaries and safety

- Turn unknown or weakly structured input into trusted application values at the
  earliest useful boundary. Keep what parsing learned instead of validating and
  discarding it.
- Keep framework, protocol, database, runtime, and vendor values inside the
  boundary that owns them. Pass application or domain values inward.
- Catch and classify unknown dependency failures at the owning boundary. Map
  internal outcomes to valid responses, exit codes, retry decisions, or startup
  errors at the outer boundary.
- Preserve existing logs, traces, metrics, and error reporting. Record safe
  structured context such as operation names, identifiers, dependency names,
  state, retries, and error categories.
- Keep secrets and raw credentials out of errors, logs, traces, and snapshots.
  Expose a sensitive raw value only where the external call needs it.
- Treat invalid configuration as a clear startup failure.

## Modules and dependencies

- Prefer composition over inheritance.
- Build cohesive modules that hide meaningful behavior, policy, sequencing, or
  translation behind a small caller burden.
- Keep interfaces narrow and expressed in the caller's terms.
- Reuse an existing integration first. Extend it when the new work belongs to
  the same capability. Create a new one only when reuse would mix ownership.
- Remove modules that only forward calls, rename another API, or mirror storage
  without hiding useful complexity.
- Keep deterministic rules independent of I/O, frameworks, mutable global
  state, ambient time, and randomness. Pass required capabilities explicitly.
- Export the supported public surface and keep implementation details private.

## State and data

- Make invalid states hard to construct when that prevents a realistic mistake.
- Use dedicated domain values when raw identifiers, units, or parsed strings can
  be confused.
- Model meaningful lifecycle states explicitly instead of combining flags and
  optional fields that permit impossible states.
- Prefer named options or domain values over boolean arguments that change
  behavior.
- Use explicit operation inputs instead of generic partial records unless
  partiality is the domain concept.
- Resolve absence before calling code that requires a value. Keep mutable state
  local, intentional, and hidden behind a precise interface. Avoid mutable global
  state.

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

## Tests

- Prefer confidence in this order when practical: tests through real public
  entrypoints, integration tests through real seams, property tests for pure
  rules, then focused unit tests.
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
