---
name: writing-for-agents
description: Write or edit agent instructions in skills, AGENTS.md, or CLAUDE.md.
---

# Writing for Agents

Preserve the intended task, explicit requirements, and permission boundaries.
Make instructions easy to find, follow, and verify. For a clear edit, use the
supplied context rather than starting an interview.

When writing a skill, read [Skill mechanics](SKILL-MECHANICS.md) for metadata,
host-specific invocation, and routers. For measured skill evaluation, use
[skill-creator](../skill-creator/SKILL.md); wording edits alone do not need that loop.

## Conditional references

A **context pointer** names material outside the current document and states
when to read it. Skill descriptions and links in `AGENTS.md` serve this role.

- Name the task or decision first, then the reference that supports it.
- Give one clear condition per distinct branch. Remove synonyms that add no case.
- Keep required shared rules visible; load branch-specific details only when needed.
- If a needed reference is missed, test a clearer pointer before moving its full
  contents into the root. Check that the target exists and the path resolves.

Always-loaded text costs context on every applicable request. Conditional files
cost context when read, plus the pointer that selects them. Separate files also
add a navigation cost for people. Split where the task paths differ, not merely
to reduce a line count. Material with no pointer can be missed by both readers.

## Information hierarchy

Separate ordered **steps** from **reference** facts. Put shared steps and rules
in the root. Move optional phases, host details, and variants into named files
with explicit loading conditions. Keep flat sets of peer rules together when
all apply to the same task.

Keep each concept's definition, constraints, and exceptions together. Avoid
scattering one rule across several sections. For long documents, split by branch
or phase while preserving a visible route through every supported path.

Do not merge distinct skills just because they share a reference. Their task
boundaries and invocation conditions may need to remain separate.

## Completion criteria

State observable evidence for completion: required files, checks, reviewed scope,
or a decision. For example, "account for every modified model" defines coverage;
"produce a change list" does not define what must be covered.

If an agent repeatedly stops a step early, first clarify its completion criterion.
Treat the idea that later steps distract it as a hypothesis to test against
recorded runs. Split the sequence only if evidence supports the change. A real
context boundary requires a fresh session or a bounded handoff; reading another
file does not remove instructions already in context.

## Wording and requirements

Use familiar terms when they have a precise meaning in the task. Define a short
label once if repeated use helps, but keep the requirements available:

- Keep "fast, deterministic, low-overhead" as three requirements. Replacing them
  with "tight" loses meaning. Add measurable limits when the task supplies them.
- Replace "a loop you believe in" with an observable condition such as "the test
  fails on the known bug and passes after the fix". "Red" alone is not the contract.
- Do not intensify "thorough" to "relentless". Define the required scope and
  stopping condition instead, without changing the user's requested effort.

Claims that a word recruits model knowledge, makes behavior more reliable, or
that negation encourages forbidden behavior are hypotheses, not universal rules.
Test wording changes on the target host and model with comparable prompts.
Record the baseline, observations, and limits before treating a hypothesis as
supported. Do not claim a result from intuition or a shorter document.

State the desired action directly when that is clearer. Retain explicit
prohibitions for safety, permissions, and task exclusions. A positive alternative
can clarify a prohibition; it must not weaken it.

## Pruning

- Keep one authoritative definition for each rule. Repeat a short label or pointer
  where useful, not the full rule in several files.
- Prefer current configuration or `--help` for cheap facts. Preserve conventions,
  reasons, dependencies, and failure recovery that those sources do not explain.
- Remove irrelevant or stale text. Move live optional detail behind a pointer
  rather than deleting it.
- Treat a suspected no-op as model- and task-specific. Check behavior before
  removing an explicit requirement; do not replace it with stronger rhetoric.
- After editing, check metadata, relative links, supported branches, and examples.
  Report what was checked and what still needs runtime evidence.
