# ADR Format

ADRs are entries in `.workplace/decisions.md` at the repo root, unless the repository's instructions name another file. Create the file lazily, when the first ADR is needed.

## Template

Append each entry to the end of the file:

```md
## 0001 — <Short title> (YYYY-MM-DD)

<1–3 sentences: the context, the decision, and why.>
```

That's it. The value is in recording *that* a decision was made and *why* — not in filling out sections.

Add `Considered options` only when a rejection is not obvious.

## Numbering

Find the highest entry number in the file and add one. Start at `0001`.

## Superseding

When a new entry replaces an old one, write `Supersedes 000N` in the new entry. Keep the old entry unchanged.

## When to offer an ADR

All three of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If a decision is easy to reverse, skip it — you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library — just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite. These stop the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it — otherwise someone will suggest GraphQL again in six months.
