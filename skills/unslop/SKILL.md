---
name: unslop
description: Remove AI-generated slop from prose or recently changed code. Use when drafting, editing, or reviewing writing, or when the user says "unslop", "deslop", "simplify", "clean up code", "simplify code", or asks for a reuse, quality, efficiency, or AI-code cleanup pass. Preserves meaning in prose and behavior in code.
---

# Unslop

## Choose a mode

- **Prose**: Use when the target is writing, documentation, copy, a report, or a message.
- **Code**: Use when the target is source code, a diff, recent changes, or a named code-quality focus.

Infer the mode from the target. Ask once when the request contains neither prose nor code context.

## Prose cleanup

Edit text to remove AI patterns while preserving its claims and intended voice.

## Editorial invariants

- **Preserve every claim.** Keep each fact, name, number, date, quote, citation, ranking, qualification, and conclusion unless the user asks to change the substance.
- **Do not invent details.** Never add facts, sources, statistics, quotes, anecdotes, or personal experiences. Mark a hypothetical as hypothetical.
- **Match the writer.** A supplied writing sample or established document style takes priority over the default rules below. Preserve deliberate quirks when they do not obscure meaning.
- **Respect the register.** Do not add opinions, first-person language, humor, or casual phrasing to reference, legal, scientific, or other neutral prose.
- **Protect literal text.** Do not rewrite quotations, proper names, code, commands, link targets, data, or examples that discuss a watched phrase unless the user asks.
- **Treat patterns as evidence, not proof.** Fix a pattern when it is repeated, formulaic, or wrong for the context. Do not flatten a human choice merely because it appears in this catalog.

## Prose process

1. Scan for the patterns below.
2. Identify the target voice, register, audience, and output format.
3. Rewrite the passage around its main points instead of replacing watched words one at a time.
4. Compare the rewrite with the source. Restore any lost claim and remove every unsupported addition.
5. Self-audit with the quick checks, then score. Fix remaining tells.

## Match voice and register

When the user supplies a writing sample, first note its sentence length, vocabulary, paragraph openings, punctuation, repeated phrases, transitions, and level of formality. Match those habits. The sample overrides generic preferences such as the em-dash rule.

Without a sample, match the context:

- **Personal writing, essays, and opinion.** Preserve mixed feelings, humor, first person, asides, and uneven rhythm when they fit.
- **Technical prose.** Keep established domain terms, symbols, commands, and concrete mechanisms. Do not replace precise terminology with casual synonyms.
- **Scientific prose.** Use "we" for the authors' work when appropriate, retain necessary qualifications, and name or cite specific researchers instead of invoking unnamed experts.
- **Reference, legal, and factual prose.** Stay neutral. Clarity matters more than personality.
- **Email, chat, and social posts.** Match the platform. Do not add Markdown to plain-text contexts or turn a short message into a document with headings.

## Add personality only when it fits

Removing patterns is half the job. Sterile writing can be just as generic, but personality must come from the source or the requested voice.

- **Keep opinions.** Preserve the writer's position instead of neutralizing it into a list of pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time. Mix it up.
- **Keep complexity.** Preserve uncertainty, mixed feelings, and unresolved tension instead of forcing a clean verdict.
- **Use "I" or "you" when the writer and context call for it.** First and second person are tools, not defaults.
- **Let some mess remain.** Do not polish away a deliberate aside, self-correction, or unusual detail.
- **Preserve specificity.** Keep concrete details from the source. Do not replace them with a generic reaction or invent new details to make the passage feel personal.

## Patterns to detect and fix

### Content

1. **Significance inflation.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "indelible mark", "deeply rooted". Remove empty framing, but preserve a sourced evaluation, reputation claim, or deliberate opinion.
2. **Notability name-dropping.** Listing media outlets without context. Preserve the named outlets, but add what they said only when the source provides that context.
3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete empty interpretation or replace it with facts already present in the source.
4. **Promotional language.** "nestled", "vibrant", "breathtaking", "groundbreaking", "renowned", "stunning", "must-visit". In neutral prose, remove sales framing without discarding a sourced reputation or evaluation. Preserve promotional tone when the genre and writer call for it.
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source when the input provides one. Otherwise preserve the qualified claim or flag the missing source in review mode instead of inventing an authority.
6. **Formulaic challenges.** "Despite challenges... continues to thrive." Use specific facts when the source provides them. Otherwise preserve the claim without the stock framing.
7. **Vague declaratives.** "The reasons are structural", "The implications are significant", "The stakes are high". Replace an announcement with its specific meaning when the source supplies it. Otherwise preserve or flag the claim instead of inventing an explanation.
8. **Lazy extremes.** "every", "always", "never", "everyone", "nobody" doing vague work. Keep a supported quantifier. If the source does not support it, flag the claim in review mode rather than silently changing it.

### Language

9. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
10. **Copula avoidance.** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
11. **Formulaic negative parallelisms.** "It's not just X, it's Y." "The answer isn't X. It's Y." "X isn't the problem. Y is." State the point directly when the contrast exists only to manufacture a reveal. Keep a contrast that carries a real distinction. See [references/structures.md](references/structures.md) for the full catalog.
12. **Negative listing.** "Not a X... Not a Y... A Z." Collapse the runway only when X and Y add no substantive claims. Otherwise preserve the distinctions in a less theatrical sentence.
13. **Forced rule of three.** Use the natural number of items. Do not add or remove an item merely to produce or avoid a group of three.
14. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one, repeat it.
15. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List topics directly.
16. **False agency.** Inanimate things doing human work can hide who acted: "the decision emerges", "a complaint becomes a fix". Name the actor when the actor matters. Keep ordinary shorthand such as "the data shows" when it is clear and natural.

### Structure and drama

17. **Dramatic fragmentation.** "[Noun]. That's it. That's the [thing]." Staccato stacks of punchy fragments. Manufactured profundity. Use complete sentences and trust the content.
18. **Rhetorical setups.** "What if [reframe]?", "Here's what I mean:", "Think about it:", "And that's okay." Remove the setup, but preserve any conclusion or distinction it carries.
19. **Throat-clearing openers.** "Here's the thing:", "The uncomfortable truth is", "Let me be clear", "It turns out". Any "here's what/this/that" construction is announcement before the point. Cut it and state the point. Full list in [references/phrases.md](references/phrases.md).
20. **Meta-commentary.** "The rest of this essay explains...", "Let me walk you through...", "As we'll see...", "But that's another post". The writing should move, not announce its own structure.
21. **Wh- sentence starters as a crutch.** "What makes this hard is..." becomes "The constraint is..." or, better, the specific constraint. Lead with the subject or the verb.
22. **Pull-quotes.** If a sentence sounds like it was written to be quoted, rewrite it.
23. **Narrator-from-a-distance.** "People tend to..." can create a detached lecturer voice. In personal or instructional prose, use a closer perspective only when the source supports it. Do not change "nobody" to "you" or otherwise alter scope and agency.

### Style

24. **Em dash overuse.** Remove repeated or formulaic em dashes. Prefer periods or commas when they read cleanly. If a supplied writing sample or established house style uses em dashes deliberately, match that style instead of banning them.
25. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors. "If you're coming from traditional automation: instead of registering event handlers, you describe conditions" adds nothing with the colon. Rewrite to let the point stand on its own without comparison framing. "Describing when the scheduler should fire works best as plain English." Same meaning, no crutch punctuation.
26. **Boldface overuse.** Don't bold every proper noun or acronym.
27. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period, names the item, and is followed by genuinely new detail ("**Schema in TypeScript.** Tables live in one file.") is fine, not a tell.
28. **Title case headings.** Use sentence case unless the document's established style requires title case.
29. **Decorative emojis.** Remove from headings and bullets.
30. **Mismatched quotation marks.** Match the source format or house style. Do not normalize curly or straight quotes without a reason.

### Communication artifacts

31. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" Remove.
32. **Cutoff disclaimers.** "While specific details are limited..." State the known limit directly. Remove only unsupported guesses or commentary that adds no claim.
33. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly.

### Filler

34. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". "It is important to note that" gets deleted. "At its core", "At the end of the day", "When it comes to", "The reality is" get deleted too.
35. **Emphasis crutches.** "Full stop.", "Let that sink in.", "Make no mistake", "This matters because". Remove empty emphasis, but retain any causal explanation or conclusion attached to it.
36. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
37. **Generic conclusions.** "The future looks bright." Prefer specific plans or facts already present in the source. Cut the sentence only when it adds no substantive claim.

### Jargon

38. **Abstract metaphor nouns.** Outside established domain usage, substrate, wedge, vector, locus, vantage, nexus, harness, bedrock, scaffolding, modality, paradigm, and gold-plating often have a plainer concrete word. "Substrate" may become "base". "Wedge in" may become "add". "Vector" may become "way" or "method". Preserve terms such as "API surface" and "language primitive" when they carry their accepted technical meaning.
39. **Business jargon.** "Navigate challenges" becomes "handle". "Unpack" becomes "explain". "Lean into" becomes "accept". "Double down" becomes "commit". "Circle back" becomes "return to". Table of replacements in [references/phrases.md](references/phrases.md).

### Plain speech

40. **Say the concrete thing.** Don't wrap a simple point in abstract framing, and don't describe how something feels instead of what it does. "the database stays close at hand", "SQL you can read", "types that follow your schema" name a feeling. Use a mechanism or number only when the source provides one: "`.toSQL()` returns the exact string sent to the database", "a column rename fails the build". If a concrete restatement would require new facts, preserve the source claim or flag it for the writer.
41. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it in two. Drop a clause only when it adds no claim.
42. **Active voice.** Prefer it when the source identifies the actor: "the file is parsed by the loader" becomes "the loader parses the file". Do not invent an actor for "queries are validated." Passive is fine when the actor is unknown or genuinely doesn't matter.
43. **Cut adverbs, or use a stronger verb.** "runs quickly" may become "is fast." Replace "significantly improves" with a measured delta only when the source provides one. Remove an adverb only when doing so preserves the claim. Frequent offenders: "really", "just", "literally", "genuinely", "honestly", "simply", "actually", "fundamentally", "crucially".
44. **Prefer the plain word.** "utilize" becomes "use", "leverage" becomes "use", "facilitate" becomes "help", "numerous" becomes "many", "in the event that" becomes "if". The fancier synonym is rarely clearer.

### Composition

45. **Invented concept labels.** Do not coin labels such as "the supervision paradox" or "the acceleration trap" to make an observation sound established. Use a name only when the text defines and needs it.
46. **Fractal summaries.** Do not preview, explain, and recap the same point at the document, section, and paragraph levels. Keep the version that helps the reader act or understand.
47. **Dead metaphor repetition.** A useful metaphor can explain one point. Repeating it across the piece turns it into scaffolding for ideas that should stand on their own.
48. **Historical analogy stacking.** Do not add companies or past technology shifts as borrowed authority. When editing an existing stack, preserve its substantive comparisons while removing repetitions that make the same claim.
49. **One-point dilution.** Cut sections that restate the thesis with new wording but add no fact, condition, example, or consequence.

## Check for false positives

Do not flag one isolated feature as proof of AI writing. Preserve:

- Deliberate repetition, fragments, contrasts, and punctuation that establish the writer's voice.
- Necessary passive voice when the actor is unknown, irrelevant, or deliberately omitted.
- Domain terminology, legal qualifications, safety notices, and supported uncertainty.
- Quotations, titles, proper names, and text used as an example.
- Useful objections and alternatives that the document names and answers.
- Specific odd details, dated references, mixed feelings, and genuine asides.

## Quick checks

Before delivering prose:

- Any adverbs propping up weak verbs? Cut them or fix the verb.
- Any passive voice without a reason? Find the actor, make them the subject.
- Inanimate thing doing a human verb ("the decision emerges")? Name the actor when known and relevant.
- Any "here's what/this/that" throat-clearing? Cut to the point.
- Any formulaic "not X, it's Y" contrasts? State Y directly unless the distinction carries meaning.
- Three consecutive sentences match length? Break one.
- Every paragraph ends with a punchy one-liner? Vary it.
- Repeated or formulaic em dashes? Rewrite them unless they belong to the writer's established style.
- Vague declarative ("The implications are significant")? Name the specific implication.
- Meta-joiners ("The rest of this essay...")? Delete. Let the text move.
- Sounds like a pull-quote? Rewrite it.

## Scoring

Rate 1-10 on each dimension:

| Dimension | Question |
|-----------|----------|
| Directness | Statements or announcements? |
| Rhythm | Varied or metronomic? |
| Trust | Respects reader intelligence? |
| Authenticity | Sounds human? |
| Density | Anything cuttable? |

Below 35/50: revise. Keep the score internal unless the user asks for it.

## Return the result

- **Pasted text.** For a rewrite request, return the final rewrite. Add a short change summary only when it helps the user assess the edit. For a review request, return the findings and examples without rewriting unless asked.
- **File.** Edit only the prose in scope. Preserve code blocks, frontmatter, data, links, and unrelated content, then report the file and the main changes.
- **Embedded use.** When another task invokes this skill for a message, document, commit message, or pull request description, return only the final text.

Before delivery, ask: "Did the rewrite add or remove any claim?" Treat an unsupported addition or a lost claim as an error.

## References

- [references/phrases.md](references/phrases.md): throat-clearing openers, emphasis crutches, business jargon table, adverb guidance, meta-commentary, vague declaratives.
- [references/structures.md](references/structures.md): binary contrasts, negative listing, false agency, narrator-from-a-distance, rhythm patterns.
- [references/examples.md](references/examples.md): before/after transformations.
- [UPSTREAM.md](UPSTREAM.md): source material, licenses, and adaptation notes.

## Code cleanup

Review the selected change scope for reuse, quality, efficiency, and AI-generated code patterns, then apply focused behavior-preserving fixes.

### 1. Select the scope

Use explicit files or a fixed point when the user provides them. Otherwise combine unstaged and staged changed files. If the worktree has no changes, compare the current branch with its merge base against the repository's base branch.

Do not include unrelated files. If there is no code in scope, report that and stop.

### 2. Read the code

Read each selected file and the surrounding project conventions. Search for existing helpers before proposing a new extraction. A pattern is not redundant until its intended behavior and ownership are understood.

### 3. Apply four lenses

For more than two small files, launch three read-only reviewers in one parallel batch. Give each reviewer the exact file list, relevant diff, code paths or contents, user focus, and one lens below. Require `file:line` evidence and a concrete fix. For a trivial change, apply the same lenses directly.

**Reuse**

- Duplicated logic within or across changed files.
- Copy-pasted patterns that should share one implementation.
- New utilities that duplicate an existing canonical helper.
- Helpers or abstractions that can be deleted in favor of a direct existing path.

**Quality and AI-code slop**

- Unused imports, variables, parameters, dead code, or unreachable branches.
- Unnecessary comments that restate code or do not match local style.
- Defensive checks, fallbacks, or `try`/`catch` blocks that are abnormal on trusted paths.
- `any`, casts, optional values, or ignored errors used to bypass a type or invariant.
- Deep nesting that should use early returns or a clearer model.
- Poor names, broad abstractions, pass-through wrappers, and code inconsistent with its neighbors.

**Efficiency**

- Repeated computation, lookup, allocation, or copying with material cost.
- Accidental quadratic work where a direct linear approach is clear.
- Missed short-circuiting or unnecessary sequential work.
- Intermediate state or variables that obscure rather than explain the flow.

**Focus area**

Weight the review toward any user-supplied focus, such as error handling, duplication, naming, memory, or performance. Do not ignore a clear correctness issue, but report it separately from cleanup work.

### 4. Judge and deduplicate

Validate every suggestion against repository conventions and actual call sites. Merge overlapping findings and rank them:

1. **High**: Significant duplication, structural confusion, unsafe type escape, or material inefficiency.
2. **Medium**: Clear readability, naming, nesting, dead-code, or local-consistency improvement.
3. **Low**: Optional style or inlining preference.

Reject speculative abstractions, micro-optimizations, and churn that only moves complexity around.

### 5. Apply fixes

Present one compact pre-edit summary grouped by file. Then apply High and Medium cleanup findings. Apply Low findings only when they are obvious, local, and reduce code. Keep edits inside the selected files.

- Preserve behavior and public contracts.
- Do not add dependencies.
- Do not add an abstraction unless it removes demonstrated duplication or clarifies ownership.
- Do not replace local style with a personal preference.
- If review finds a bug that needs a behavior change, report it instead of folding it into cleanup unless the user also asked for bug fixes.

### 6. Verify

Run the repository-defined format, lint, typecheck, build, and relevant tests for the final files. If a check fails because of an unslop edit, fix that edit and rerun the affected checks. Do not hide failures or revert unrelated user work.

### 7. Report

Report the files changed, the slop removed, and the checks run. Keep the summary concise. Mention rejected or deferred findings only when they explain an important tradeoff.
