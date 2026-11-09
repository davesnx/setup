---
name: code-standards
description: "Consult shared code standards for a relevant design decision or an explicit standards reference request, not for every code change. Not for module or type design of new production code; use architect. Not for glossary, invariants, or ADRs; use domain-modeling."
---

# Code standards

Consult the sections relevant to the design decision or reference request.
Apply them within the task's scope. Keep unrelated old code unchanged.

## Decision order

1. Preserve correctness, safety, and the ability to diagnose failures.
2. Meet the requested behavior and public contract.
3. Follow compatible repository architecture and conventions.
4. Contain incompatible old patterns at the nearest boundary.
5. Prefer the solution with less owned complexity.

## References

- [references/complexity.md](references/complexity.md): before adding an abstraction, guard, fallback, retry, or layer, or when a diff grows.
- [references/cyclomatic-complexity.md](references/cyclomatic-complexity.md): when judging branch counts or a configured complexity limit.
- [references/boundaries-and-safety.md](references/boundaries-and-safety.md): for input parsing, casts, permissions, secrets, configuration, logging, or destructive path operations.
- [references/functions.md](references/functions.md): when shaping or reviewing a function body.
- [references/modules-and-dependencies.md](references/modules-and-dependencies.md): when splitting, merging, or wiring modules and integrations.
- [references/state-and-data.md](references/state-and-data.md): for flags, optional fields, mutable state, and lifecycle states.
- [references/failures.md](references/failures.md): when choosing how an operation reports or handles errors.
- [references/domain-modeling-with-types.md](references/domain-modeling-with-types.md): when writing types, wrappers, constructors, or parse functions.
- [references/tests.md](references/tests.md): when choosing or writing tests.
- [references/operations.md](references/operations.md): for retries, idempotency, transactions, durable workflows, and resource lifecycle.
