---
name: architect
description: "Design production modules and integration contracts from caller usage, types, constraints, and evidence. Use for module or interface design before implementation. For disposable interactive logic experiments, use logic-prototype."
---

# Architect

Design the production contract before implementation. Default to one grounded
design, developed directly. The caller's usage, core types, constraints, and
evidence determine the shape; a comparison workflow is optional.

## Boundary

- Architect owns production module and interface design that code will implement.
- Logic Prototype owns disposable, drivable HTML used to learn whether logic
  works. Route by the requested deliverable, not by the subject. A production
  state-machine interface belongs here; an interactive state-machine experiment
  does not.
- Architect ends with a design. Do not edit production source or implement
  sketched bodies. If implementation was also requested, hand the design to the
  normal implementation workflow after this design step.

## Design discipline

Trace the relevant callers, data flow, ownership, tests, and constraints before
choosing a shape. Cite the code or supplied requirements that drive each material
decision. For greenfield work, state assumptions and integration constraints.
Inspect history and design records when changing established ownership or layering.

Write a realistic caller usage sketch first, then derive types and signatures.
Trace the dominant access patterns through those types. Show validation, errors,
invariants, and dependency direction where they affect correct use. Encode
invariants in types where practical and keep one source of truth per invariant.

For shared state, trace concurrent writers, repeated operations, and failure
halfway through a transition. Explain how ownership and recovery preserve the
contract. Prefer a small interface that hides real complexity; add seams only for
demonstrated variation. Use declarations, `not implemented` bodies, or brief
pseudocode to make the design traceable without implementing it.

Check that the proposed usage agrees with the types and the existing callers.
Show how the important success and failure paths can be verified through the
interface. Distinguish checks performed from checks proposed for implementation.

## When to expand

- For module depth, seam placement, or restructuring, read
  [codebase-design.md](references/codebase-design.md). For dependency-heavy
  deepening, also read [deepening.md](references/deepening.md).
- Compare whole-shape alternatives when the user requests them, or when a real
  unresolved tradeoff or hard-to-reverse risk could change the recommendation.
  Read [design-it-twice.md](references/design-it-twice.md) for that workflow.
  Parallel candidates earn their cost through independent questions, not model
  availability. Respect explicit requests for parallel work; if tools cannot
  support them, state the limit rather than claiming independent results.
- Use [rationale-template.md](references/rationale-template.md) when a larger
  design needs a durable explanation. Use only the sections the decision needs.

## Deliver

For a small change, the response can contain the usage, type sketch, short
rationale, and first implementation step. If a saved sketch is useful or
requested, one small file can hold both design and rationale. Add a module map,
comparison, or separate documents only when scope or the requested handoff needs
them. Record real rejected alternatives, not invented contenders to fill a template.

Finish when callers, types, constraints, and verification paths agree. State any
unresolved decision and its effect. User feedback or later implementation evidence
can reopen the affected decision without restarting an unrelated workflow.

Once required design decisions are settled, recommend `/implement` with the
completed design and agreed scope.
