---
name: technical-writing
description: Research technical questions and write or review technical docs, RFCs, READMEs, PR descriptions, commit messages, and X posts with clear structure and plain language. Use for "research this", "gather primary sources", technical writing, docs, tutorials, how-to guides, reference, explanation, RFCs, "write a tweet", "write an X post", "optimize this post", or diagnosing why an X post underperformed.
metadata:
  source: "https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md"
  x-algorithm-source: "https://github.com/xai-org/x-algorithm"
---

# Technical writing

Write text that a tired engineer understands on the first read.

## Modes

- **Technical document**: Apply the four writing layers below. Pick one Diataxis mode for each document.
- **Research**: Read [references/research.md](references/research.md), investigate against primary sources, and save a cited Markdown artifact before drawing conclusions.
- **X post**: Apply the sentence rules below, then read [references/x-posts.md](references/x-posts.md). Use verified recommendation-system facts only as constraints, not as guaranteed growth tactics.

Both modes use `unslop` as the final editing pass.

## Rules above the layers

- Cut every word that does no work. "In order to" becomes "to". Delete "It is important to note that".
- Use the short, everyday word. Use "use", not "utilize". Use "help", not "facilitate".
- When a rule makes a sentence worse, fix the sentence another way or leave it alone. The rules serve the reader.
- Use the real symbol, file, flag, command, product, and domain term from the codebase. Do not invent a synonym.
- Do not invent jargon. Define a necessary named pattern the first time it appears.
- Treat scope as a hard constraint. For a named task, keep only source facts
  required for that task, its conditions, or its verification. Omit sibling
  options and adjacent facts even when the source includes them.

## Vary the rhythm

- Mix sentence lengths. Short sentences land a point. Longer sentences can carry one fact with its condition or consequence.
- One thought per sentence does not mean one sentence length.
- Have a view when the document mode allows it. Explanation can weigh tradeoffs. Reference stays dry.
- Prefer a specific mechanism, command, number, or failure over sterile general language.

## Pick the document mode first

One document uses one Diataxis mode:

- Action plus learning: **Tutorial**.
- Action plus work: **How-to**.
- Understanding plus work: **Reference**.
- Understanding plus learning: **Explanation**.

Before rewriting, state the requested task in one clause. Include only source
facts needed to complete that task, understand a required condition, or verify
the result. A detail does not belong merely because it appears in the source.

### Tutorial

Teach by helping the reader build something. Open with what the reader will build. Every step produces a visible result. State expected output. Keep explanation to one clause and a link. Write commands in sequence and keep the learner moving.

### How-to

Solve one real task for a competent reader. Use direct steps, optional forks, and judgment where needed. Remove background, teaching, unrelated options, and completeness that do not help complete the requested task. A one-step task needs one direct command sentence, not a padded list. Name the guide after the goal in sentence case.

### Reference

Provide facts for lookup. State options, limits, defaults, errors, and types without persuasion. Mirror the structure of the code or product. Generate from code where practical.

### Explanation

Explain one bounded topic and its why. Include context, history, constraints, alternatives, and tradeoffs. Opinion is allowed when it helps the reader understand a decision.

Do not mix modes inside one document. Split and link when the reader needs another mode.

## Write to the reader

- Address the reader as "you" and use present tense.
- Say who does what. Prefer "the compiler checks" to "is checked".
- Write instructions as commands.
- Put the condition before the instruction: "To delete the document, click **Delete**."
- Put the common case first and exceptions after it.
- Do not call a task simple, easy, or quick.
- Use descriptive link text, not "click here".
- Use sentence-case headings. Use a verb phrase for a task heading and a noun phrase for a concept heading.
- Use numbered lists for sequences and bullets for other lists. Keep list items parallel.
- Put code in code font and UI elements in bold.
- Use serial commas. Replace "etc." with a statement that the list is partial.

## Load one statement at a time

- Put one instruction in each sentence and one thought in each other sentence.
- Split instructions longer than about 20 words and other sentences longer than about 25 words when the split improves clarity.
- Put a warning or condition before the step it controls.
- Keep articles when they prevent ambiguity: "Remove the backup file."
- Give each word one meaning and one job. Use one word for one action throughout the document.
- Write procedures as direct commands, not narration or passive obligation.
- Avoid `-ing` constructions when they make the actor or sequence unclear.

## Leave one reading

- Put "only" and "not" next to the words they modify.
- Break up long noun strings.
- Make every pronoun point to one obvious noun. Repeat the noun when needed.
- Give every clause a verb.
- Keep small words such as "that" when they remove ambiguity.
- Repeat articles in a series when they distinguish separate things.
- Make the grouping of "and" and "or" explicit with "both", "either", or an `if` and `then` structure.
- Use periods instead of semicolons or em dashes.
- Make parenthetical text a complete grammatical unit or a separate sentence.
- Replace slashes with explicit alternatives: "a, b, or both".
- Use one name for each thing throughout the document and across edits.
- Avoid idioms, Latin abbreviations, metaphors, and culture-specific shorthand.

## Repository-specific rules

- Apply `unslop` to every document this skill changes.
- PR descriptions and commit messages use every layer except Diataxis.
- Product UI strings use the product's copy guidance instead of this documentation workflow.
- Write real paths and symbols. Verify every count, tree, and command against the current commit.
- Include the command that regenerates generated facts.

## Review checklist

1. Is each document one Diataxis mode?
2. Is every instruction a command with its condition first?
3. Does any sentence carry two instructions or unrelated thoughts?
4. Can any word be removed without losing meaning?
5. Is every modifier next to what it modifies, and every pronoun unambiguous?
6. Does each thing have one name throughout the text?
7. Would a developer say these words aloud?
8. Are symbols, paths, commands, and counts correct at this commit?
9. Did `unslop` remove filler, AI vocabulary, formatting tells, and false drama?

## Sources

The integrated sources and update policy are documented in [UPSTREAM.md](UPSTREAM.md).
