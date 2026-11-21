# Glossary Format

The glossary is `.workplace/glossary.md` at the repo root, unless the repository's instructions name another file.

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.

## Single vs multi-context repos

**Single context (most repos):** One top-level section, in the structure above.

**Multiple contexts:** One top-level section per context, each in the structure above. Put a `Contexts` section first. It lists the contexts and how they relate to each other:

```md
# Contexts

- **Ordering** — receives and tracks customer orders
- **Billing** — generates invoices and processes payments
- **Fulfillment** — manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

The skill infers which structure applies:

- If the glossary has a `Contexts` section, read it to find contexts
- If it has one context section, single context
- If it does not exist, create it lazily when the first term is resolved

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask.
