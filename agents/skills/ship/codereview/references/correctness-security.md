# Correctness And Security Lens

Review only issues introduced or exposed by the change. Trace effects beyond the diff when changed code interacts with existing modules, packages, services, configuration, or persisted data.

## Review Areas

- Incorrect logic, wrong conditions, boundary errors, null access, and invalid assumptions.
- Breaking behavior in callers, consumers, public APIs, schemas, wire formats, and stored data.
- Authentication or authorization bypass, injection, unsafe deserialization, secret exposure, and trust-boundary mistakes.
- Data loss, partial writes, missing rollback, non-atomic state changes, and destructive error paths.
- Race conditions, async ordering, shared mutable state, resource leaks, and missing cleanup.
- Swallowed errors, misleading fallback behavior, retries without bounds, and failures reported as success.
- Feature-gated or internal behavior that can leak into public paths.
- Developer-experience regressions involving environment variables, ports, secrets, scripts, generated files, or local build and run steps.

## Research Rules

- Trace each suspected issue end to end. Do not report an unfinished conditional claim when the repository contains the code needed to resolve it.
- Distinguish intended breakage from accidental breakage. Do not report a deliberate, well-contained behavior change unless its wider impact appears misunderstood.
- Confirm high-risk findings against callers, tests, configuration, backend or frontend counterparts, and pinned dependency behavior as applicable.
- Review PR discussion only after the independent audit. Use existing bot or reviewer findings as additional evidence, not as the source of the review.

## Calibration

High severity requires a realistic execution path and meaningful impact. Do not inflate priority to make the review look thorough. Prefer a few fully researched findings over speculative warnings.
