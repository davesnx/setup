# Boundaries and safety

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
- Before a destructive path operation (delete, move, overwrite), resolve the
  real path, follow symlinks first, and refuse any target outside the allowed
  roots or equal to a root.
