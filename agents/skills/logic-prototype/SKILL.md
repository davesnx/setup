---
name: logic-prototype
description: "Build throwaway, self-contained, drivable HTML artifacts to answer state-model, transition, policy, scheduling, or algorithm questions. Use ONLY when the requested result is a disposable interactive logic experiment used to test behavior before production design or implementation; do not use for production modules, interfaces, types, seams, or architecture contracts."
---

# Logic Prototype

Build one disposable HTML artifact that lets a human drive logic and inspect
its state. The artifact answers a narrow behavior question; it is not a first
version of production code.

## Boundary

- Logic Prototype owns interactive experiments for state models, transitions,
  policies, schedules, and algorithms.
- Architect owns the production module, interface, type, seam, and dependency
  design that implementation will follow. Route by the requested deliverable,
  not by the subject. A drivable scheduling experiment belongs here; a
  production scheduler interface does not.
- Do not modify production source files or promote the HTML shell into the
  application.

## Workflow

1. State the exact behavior question and the assumptions that affect it.
2. Read [references/logic-prototype.md](references/logic-prototype.md) and build
   its single-file artifact.
3. Run deterministic local checks for script syntax, the main path, the
   difficult edge case, and rejected or invalid behavior. Do not use a model
   judge to verify logic that code can check.
4. Open the artifact when browser tools are available and drive every control.
   If browser tools are unavailable, report that limit after the local checks.
5. Record the answer, the evidence from the scenarios, and assumptions the
   experiment rejected.

## Handoff

Keep the artifact throwaway. When the question is settled, use Architect if a
production contract still needs design. Use the normal implementation workflow
to write and test production code.
