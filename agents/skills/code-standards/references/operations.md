# Operations

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
