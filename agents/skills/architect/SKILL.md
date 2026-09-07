---
name: architect
description: "Design production modules, interfaces, seams, types, signatures, and dependency structure before implementation. Use ONLY when the requested result is a production code shape or integration contract, such as 'architect this' or 'design this module'. Do not use for throwaway HTML experiments that test state, transition, policy, scheduling, or algorithm behavior."
---

# Architect

Design the production contract before implementation. Sketch caller usage, types,
function signatures, module boundaries, seams, and dependency direction with
`not implemented` bodies or brief pseudocode where needed. Synthesize across
multiple model perspectives, then hand the chosen design to the implementation
workflow.

## Boundary

- Architect owns production module and interface design that code will implement.
- Logic Prototype owns disposable, drivable HTML used to learn whether logic
  works. Route by the requested deliverable, not by the subject. A production
  state-machine interface belongs here; an interactive state-machine experiment
  does not.
- Architect ends with a design package. Do not write production implementation
  as part of this skill.

## Start

Open a todolist with one entry per phase before starting. Autonomous mode without checkpoints needs the list to show phase position and keep phases from silently disappearing.

1. Ground
2. Explore and synthesize
3. Deliver and hand off

## Phase A: Ground the problem

Build a real mental model of every system the new code touches. Trace the relevant entry points, data flow, ownership, boundaries, and callers directly. Critique the current structure when it constrains the design.

Read `references/codebase-design.md` and use its module, interface, depth, seam, adapter, leverage, and locality vocabulary throughout. For dependency-heavy restructuring, also read `references/deepening.md`.

Naming a file isn't grounding. Produce a traced model of the relevant subsystem. If the design redefines ownership or layering, inspect commit history, architecture docs, and nearby decisions so the existing rationale becomes a constraint, not a guess.

Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate.

## Phase B: Explore and synthesize

Launch one read-only design runner per available configured model in parallel. Give every runner the Phase A grounding artifacts, `references/codebase-design.md`, and `references/runner-prompt.md`. Each candidate produces a design package shaped per `references/rationale-template.md`: the caller's usage written first, then the type sketch, function signatures, module map, and prose rationale derived from it. Use `references/design-it-twice.md` when the interface needs deliberately different shapes rather than variations of one design. If model selection is unavailable, use independent runners and state that the candidates do not prove model diversity.

Explore whole-shape alternatives, not point fixes inside one shape.

Compare the candidates, select the strongest package as the base, and graft in compatible strengths from the others. Record what was selected, adapted, and rejected in the rationale's "Synthesis decision" section.

## Phase C: Deliver and hand off

Present the synthesized design as the final Architect result. Include the
caller's usage, type and signature sketch, module map, seam and adapter choices,
invariants, tradeoffs, rejected alternatives, open questions, and the first
implementation step.

Do not edit production source files or fill in the sketched bodies. If the user
also requested implementation, make the completed design the input to the
normal implementation workflow. Changes discovered during later implementation
are new evidence and can trigger another Architect pass.

If the human rejects the shape, treat that response as Phase A evidence,
re-ground, and run Phase B again. For adversarial pressure before handoff, run
an adversarial review of the synthesized sketch where the harness offers one
(in OpenCode, the code-review skill's Adversarial mode).

## Outputs

The caller's usage is written first and the type sketch derived from it. One file with new types and signatures for small changes; module map plus type definitions for larger work. The rationale ships alongside, shaped per `references/rationale-template.md`, including the usage sketch and the synthesis decision.
