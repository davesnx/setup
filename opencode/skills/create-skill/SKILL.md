---
name: create-skill
description: Create or write a new agent skill. Use when the user wants to create a skill or turn repeated agent behavior into a reusable skill.
---

# Create Skill

Build skills for predictable process, not fixed output.

## 1. Define The Invocation

Inspect the conversation and existing skills before asking questions. Gather only what remains unknown:

- What outcome should the skill produce?
- What user language or situation should invoke it?
- Should OpenCode invoke it automatically, or does the user need an explicit-only command instead?
- What scope should own it: project or global?
- What inputs, tools, constraints, and artifacts does it need?

Prefer one focused batch of questions. Continue only when the outcome, invocation, and scope are explicit.

## 2. Design The Process

Choose a leading word that anchors the skill's behavior. Separate ordered steps from reference material, and identify genuinely distinct branches.

For every step, write a checkable completion criterion. Make the criterion exhaustive where incomplete legwork would produce a plausible but wrong result.

Keep material in `SKILL.md` when every run needs it. Put branch-specific reference in a clearly named sibling file behind a context pointer. Split into another skill only when it needs independent invocation or when hiding later steps prevents premature completion.

The design is complete when every requested behavior belongs to one step, branch, or reference file and no behavior has two homes.

## 3. Author The Skill

Create `<scope>/skills/<name>/SKILL.md`, using the repository's established skill directory when one exists. Otherwise use `.opencode/skills` for project scope or `~/.agents/skills` for global scope.

Use lowercase hyphenated names of at most 64 characters. Write a third-person description that states what the skill does and names each distinct trigger branch once. OpenCode requires descriptions for discoverable skills; when the user needs explicit-only invocation, explain that boundary and offer an OpenCode command instead.

Write positive target behavior. Keep hard prohibitions only for genuine guardrails and pair each with the action to take instead. Prefer direct instructions over persona, exposition, and examples that merely restate rules.

The skill is authored when its files exist at the chosen scope and all context pointers resolve.

## 4. Prune And Validate

Review every sentence with these tests:

- Relevance: does it bear on the skill's behavior?
- No-op: would the agent behave differently without it?
- Duplication: is this meaning authoritative in exactly one place?
- Invocation: does the description cover every real trigger branch without synonyms?
- Hierarchy: are steps prominent and branch-only reference disclosed?
- Completion: can the agent tell when every step is finished?

Delete failures rather than softening them. Then validate frontmatter, paths, links, and any repository-defined skill checks. Report the created files, invocation behavior, and validation performed.

The work is complete when every sentence passes the review, validation succeeds, and the user knows whether the host must restart to discover the new skill.
