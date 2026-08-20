---
name: architect
description: "Design deep modules, interfaces, seams, types, signatures, and module structure before code, or build a throwaway logic prototype to answer a state-model question. Use for /architect, 'architect this', 'design this', 'design this module', 'improve this interface', 'deepen this module', 'prototype this logic', 'does this state model work', or non-trivial work where jumping to production code would lock in the wrong shape."
---

# Architect

Design before implementing. Sketch types, function signatures, class shapes, and module boundaries with `not implemented` bodies and pseudocode. Synthesize across multiple model perspectives, then fill in code against the chosen sketch. If implementation proves the sketch wrong, throw it out and redesign.

## Modes

- **Architecture**: Use the Ground, Sketch, Agree, Implement, and Scrap phases below.
- **Logic prototype**: Read [references/logic-prototype.md](references/logic-prototype.md). Build one throwaway, self-contained HTML artifact that lets a human test a state model through scenarios. Do not run the production implementation phases.

## Start

Open a todolist with one entry per phase before starting. Autonomous mode without checkpoints needs the list to show phase position and keep phases from silently disappearing.

1. Ground
2. Sketch
3. Agree
4. Implement
5. Scrap

## Phase A: Ground the problem

Build a real mental model of every system the new code touches. Run the **how** skill over the relevant subsystems. Critique mode if existing structure is the constraint or the design must push back on it.

Read `references/codebase-design.md` and use its module, interface, depth, seam, adapter, leverage, and locality vocabulary throughout. For dependency-heavy restructuring, also read `references/deepening.md`.

Naming a file isn't grounding. Produce the traced model `how` prescribes. If the design redefines ownership or layering, inspect commit history, architecture docs, and nearby decisions so the existing rationale becomes a constraint, not a guess.

Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate.

## Phase B: Sketch

Launch one read-only design runner per configured architect model in parallel. Give every runner the Phase A grounding artifacts, `references/codebase-design.md`, and `references/runner-prompt.md`. Each candidate produces a design package shaped per `references/rationale-template.md`: the caller's usage written first, then the type sketch, function signatures, module map, and prose rationale derived from it. Use `references/design-it-twice.md` when the interface needs deliberately different shapes rather than variations of one design.

Use your configured architect runners (defaults `claude-opus-4-8-thinking-xhigh`, `gpt-5.5-high-fast`, `grok-4.5-fast-xhigh`).

This is the **exhaust-the-design-space** principle skill made concrete. Whole-shape alternatives, not point fixes inside one shape.

Compare the candidates, select the strongest package as the base, and graft in compatible strengths from the others. Record what was selected, adapted, and rejected in the rationale's "Synthesis decision" section.

## Phase C: Agree (opt-in)

Default: proceed directly to implementation with the synthesized design. No human checkpoint.

Opt in to a checkpoint when the invoker explicitly asks: "/architect with checkpoint," "stop and show me before implementing," or similar. Then surface the synthesized design and pause for sign-off.

The synthesis can ship as its own commit either way. That's the "scaffold first" mode of the **foundational-thinking** principle skill; subsequent commits read as filling in bodies against a stable contract. Planned and scoped breakage during fill-in is fine, per the **outcome-oriented-execution** principle skill. For adversarial pressure on the design before implementing, run the **interrogate** skill on the synthesized sketch.

If the human pushes back on the shape (in a checkpoint or after the fact), treat that as Phase A evidence. Re-ground and re-run Phase B before writing more code.

## Phase D: Implement against the sketch

Replace `not implemented` bodies with code, pseudocode with logic. The synthesized sketch is the contract.

Deviations from the sketch are signal worth surfacing, not friction to absorb silently. If a function needs a parameter the sketch didn't anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching. Surface it; don't bolt it on.

## Phase E: Scrap when the architecture is wrong

If implementation keeps producing friction the sketch can't absorb, throw the sketch out. Don't bolt fixes onto a wrong design, per the **redesign-from-first-principles** and **fix-root-causes** principle skills.

The signal is a *pattern*, not single instances. Tells:

- The same shape of workaround appearing repeatedly across unrelated code.
- Multiple unrelated edge cases that all need special-case branches.
- Types that need escape hatches (`any`, casts, optional fields always set in practice) to compile.
- The "we need a lock" reflex when the sketch said the state wasn't shared.
- Callers having to know the abstraction's internal rules to use it.
- Two or more independent Phase D deviations of the same shape across the implementation. Surfacing deviations is Phase D's job; a repeated pattern of them is Phase E's trigger.

Use judgment. A few edge cases don't condemn an architecture. Some problems are legitimately complex; complexity in the data is not complexity in the design. The rewrite signal is repeated friction of the same shape, not single hard cases.

When you scrap:

1. Re-run the **how** skill over what's been built. The implementation lessons enter the new design as inputs, not vibes.
2. Redesign as if the new constraints had been day-one assumptions, per redesign-from-first-principles.
3. Subtract before adding, per the **subtract-before-you-add** principle skill. The new sketch should be smaller than the old one before it grows.
4. Return to Phase B and generate a new set of design candidates.

## Outputs

The caller's usage is written first and the type sketch derived from it. One file with new types and signatures for small changes; module map plus type definitions for larger work. The rationale ships alongside, shaped per `references/rationale-template.md`, including the usage sketch and the synthesis decision.
