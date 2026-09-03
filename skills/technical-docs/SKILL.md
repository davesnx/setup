---
name: technical-docs
description: Write, edit, or review developer documentation such as READMEs, RFCs, tutorials, how-to guides, reference pages, explanations, PR descriptions, runbooks, and architecture docs. Use when the requested result is developer-facing documentation, including documentation based on supplied facts. Do not use for open-ended evidence gathering or source conflict analysis, or for X posts, which belong to x-writing. Do not use for commit messages, product UI copy, or code review findings.
metadata:
  source: "https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md"
---

# Technical docs

Write developer documentation that a tired engineer understands on the first read.

## Set the document contract

Before writing, state the reader, the task or question, and the document type in one clause. Treat the requested scope as a hard limit. Include only facts that help the reader complete the task, understand a required condition, or verify the result.

Use one primary documentation mode:

- **Tutorial**: Help a learner build something and see progress.
- **How-to**: Help a competent reader complete one real task.
- **Reference**: Give exact facts for lookup.
- **Explanation**: Explain one bounded topic, its causes, and its tradeoffs.

Split and link documents when the reader needs more than one mode.

## Use the right structure

### Tutorial

Open with what the reader will build. Put commands in execution order. Make each step produce a visible result and state the expected output. Keep background detail short so the learner continues to move.

### How-to

Name the guide after its goal. Use direct steps, optional branches, and required checks. Remove history, teaching, sibling options, and unrelated settings. A one-step task needs one direct instruction, not a padded list.

### Reference

Mirror the product or code structure. State types, defaults, limits, options, errors, and version constraints without persuasion. Generate facts from code when practical and include the regeneration command.

### Explanation

Explain the mechanism and why it exists. Include relevant context, constraints, alternatives, and tradeoffs. Mark opinion as opinion.

### README

Lead with purpose and the shortest verified path to first use. Add prerequisites before the commands they control. Keep detailed concepts and uncommon operations in linked documents.

### RFC or architecture document

State the problem, constraints, goals, non-goals, proposed design, alternatives, risks, rollout, and unresolved questions. Separate current facts from proposed behavior. Record the decision and its consequences.

### PR description

Explain the problem, the behavior change, the reason for the approach, and the verification. Include user-visible risks, rollout needs, and screenshots when they help review. Do not restate the diff file by file.

## Write direct sentences

- Address the reader as "you" and use present tense.
- Say who does what. Prefer "the compiler checks" to "is checked".
- Write instructions as commands. Put a condition before the instruction it controls.
- Put the common case first and exceptions after it.
- Use the real symbol, path, flag, command, product name, and domain term.
- Define a necessary named pattern the first time it appears.
- Use one term for one thing throughout the document.
- Keep one instruction in each sentence. Split unrelated thoughts.
- Put "only" and "not" next to the words they modify.
- Use periods instead of semicolons or em dashes.
- Use numbered lists for sequences and bullets for other lists.
- Use sentence-case headings. Use verb phrases for tasks and noun phrases for concepts.
- Put code in code font and UI labels in bold.
- Do not call a task simple, easy, or quick.

Cut filler, hype, false drama, and words that do no work. Prefer short, familiar words, but keep required technical terms exact.

## Verify repository facts

Inspect the current repository before you state paths, symbols, commands, file trees, counts, generated values, or test results. Do not invent missing commands or values. If a fact needs research beyond the supplied material, stop and ask for technical research rather than presenting a guess as documentation.

## Final review

1. Does the document have one clear reader and purpose?
2. Does each section belong to the selected document type?
3. Is every instruction direct, ordered, and testable?
4. Are all paths, symbols, commands, counts, and outputs verified?
5. Did the edit preserve required facts and remove unrelated detail?
6. Can any word be removed without losing meaning?
7. Does each pronoun have one clear noun?
8. Would a developer use these words in a normal conversation?

## Provenance

See [UPSTREAM.md](UPSTREAM.md) for the integrated source and update record.
