---
name: unslop
description: Remove AI-generated slop from existing prose. Use only when the user explicitly asks to unslop or deslop writing, or to simplify, clean up, humanize, or remove AI patterns from prose. Do not use for source code or as a final pass for another writing skill.
---

# Unslop

Edit text to remove AI patterns and add human voice.

## Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning, match intended tone.
3. Add soul (see next section).
4. Self-audit with the quick checks, then score. Fix remaining tells.

## Adding soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- **Have opinions.** React to facts instead of neutrally listing pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time. Mix it up.
- **Acknowledge complexity.** "Impressive but also kind of unsettling" beats "impressive."
- **Use "I" when it fits.** First person isn't unprofessional.
- **Put the reader in the room.** "You" beats "People." "You don't sit down one day and decide to..." beats "Nobody designed this."
- **Let some mess in.** Perfect structure feels algorithmic.
- **Be specific.** Not "this is concerning" but "there's something unsettling about agents churning away at 3am."

## Patterns to detect and fix

### Content

1. **Significance inflation.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "indelible mark", "deeply rooted". Cut puffery, state what happened.
2. **Notability name-dropping.** Listing media outlets without context. Pick one, say what was said.
3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real sources.
4. **Promotional language.** "nestled", "vibrant", "breathtaking", "groundbreaking", "renowned", "stunning", "must-visit". Use neutral descriptions.
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source or delete.
6. **Formulaic challenges.** "Despite challenges... continues to thrive." Replace with specific facts.
7. **Vague declaratives.** "The reasons are structural", "The implications are significant", "The stakes are high". If a sentence announces importance without naming the specific thing, cut it or replace it with the specific thing.
8. **Lazy extremes.** "every", "always", "never", "everyone", "nobody" doing vague work. False authority. Use specifics instead of sweeping claims.

### Language

9. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
10. **Copula avoidance.** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
11. **Negative parallelisms.** "It's not just X, it's Y." "The answer isn't X. It's Y." "X isn't the problem. Y is." State the point directly. Drop the negation entirely. See [references/structures.md](references/structures.md) for the full catalog of contrast formulas.
12. **Negative listing.** "Not a X... Not a Y... A Z." A rhetorical striptease. State Z, the reader doesn't need the runway.
13. **Rule of three.** Forcing ideas into groups of three. Use the natural number. Two items beat three.
14. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one, repeat it.
15. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List topics directly.
16. **False agency.** Inanimate things doing human verbs: "the decision emerges", "the data tells us", "a complaint becomes a fix", "the culture shifts". Name the human. "The team fixed it that week." If no specific person fits, use "you".

### Structure and drama

17. **Dramatic fragmentation.** "[Noun]. That's it. That's the [thing]." Staccato stacks of punchy fragments. Manufactured profundity. Use complete sentences and trust the content.
18. **Rhetorical setups.** "What if [reframe]?", "Here's what I mean:", "Think about it:", "And that's okay." Make the point; let readers draw conclusions.
19. **Throat-clearing openers.** "Here's the thing:", "The uncomfortable truth is", "Let me be clear", "It turns out". Any "here's what/this/that" construction is announcement before the point. Cut it and state the point. Full list in [references/phrases.md](references/phrases.md).
20. **Meta-commentary.** "The rest of this essay explains...", "Let me walk you through...", "As we'll see...", "But that's another post". The writing should move, not announce its own structure.
21. **Wh- sentence starters as a crutch.** "What makes this hard is..." becomes "The constraint is..." or, better, the specific constraint. Lead with the subject or the verb.
22. **Pull-quotes.** If a sentence sounds like it was written to be quoted, rewrite it.
23. **Narrator-from-a-distance.** "Nobody designed this.", "People tend to...", lecturer voice. Put the reader in the scene instead.

### Style

24. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only (no parentheses, no en dashes, no hyphen-as-dash substitutes). Em dashes are an AI tell, and reaching for parentheses instead just trades one tell for another. If a thought needs separation, end the sentence or use a comma.
25. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors. "If you're coming from traditional automation: instead of registering event handlers, you describe conditions" adds nothing with the colon. Rewrite to let the point stand on its own without comparison framing. "Describing when the scheduler should fire works best as plain English." Same meaning, no crutch punctuation.
26. **Boldface overuse.** Don't bold every proper noun or acronym.
27. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period, names the item, and is followed by genuinely new detail ("**Schema in TypeScript.** Tables live in one file.") is fine, not a tell.
28. **Title case headings.** Use sentence case.
29. **Decorative emojis.** Remove from headings and bullets.
30. **Curly quotes.** Replace with straight quotes.

### Communication artifacts

31. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" Remove.
32. **Cutoff disclaimers.** "While specific details are limited..." Find sources or remove.
33. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly.

### Filler

34. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". "It is important to note that" gets deleted. "At its core", "At the end of the day", "When it comes to", "The reality is" get deleted too.
35. **Emphasis crutches.** "Full stop.", "Let that sink in.", "Make no mistake", "This matters because". They add no meaning. Delete.
36. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
37. **Generic conclusions.** "The future looks bright." State specific plans or facts.

### Jargon

38. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus, primitive (as noun), harness (as metaphor), surface (as in "API surface"), bedrock, scaffolding (as metaphor), modality, paradigm, gold-plating. These read as technical but usually have a plainer concrete word. "Substrate" becomes "base". "Wedge in" becomes "add". "Vector" becomes "way" or "method". "Gold-plating" becomes "more than the job needs". Pick the concrete word.
39. **Business jargon.** "Navigate challenges" becomes "handle". "Unpack" becomes "explain". "Lean into" becomes "accept". "Double down" becomes "commit". "Circle back" becomes "return to". Table of replacements in [references/phrases.md](references/phrases.md).

### Plain speech

40. **Say the concrete thing.** Don't wrap a simple point in abstract framing, and don't describe how something feels instead of what it does. "the database stays close at hand", "SQL you can read", "types that follow your schema" name a feeling. The fix names the mechanism or a number: "`.toSQL()` returns the exact string sent to the database", "a column rename fails the build". Ask what the sentence tells the reader to do or know, then write that. If you can't restate it as a concrete instruction, fact, or number, cut it.
41. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it in two or drop clauses. One idea per sentence.
42. **Active voice.** Prefer it. Catch "is/are/was/were + past participle" and name the actor: "queries are validated" becomes "the compiler validates queries", "the file is parsed by the loader" becomes "the loader parses the file". Passive is fine only when the actor is unknown or genuinely doesn't matter.
43. **Cut adverbs, or use a stronger verb.** "runs quickly" becomes "is fast" or the number. "significantly improves" becomes the measured delta. An adverb propping up a weak verb means the verb is wrong. Frequent offenders: "really", "just", "literally", "genuinely", "honestly", "simply", "actually", "fundamentally", "crucially".
44. **Prefer the plain word.** "utilize" becomes "use", "leverage" becomes "use", "facilitate" becomes "help", "numerous" becomes "many", "in the event that" becomes "if". The fancier synonym is rarely clearer.

## Quick checks

Before delivering prose:

- Any adverbs propping up weak verbs? Kill them or fix the verb.
- Any passive voice without a reason? Find the actor, make them the subject.
- Inanimate thing doing a human verb ("the decision emerges")? Name the person.
- Any "here's what/this/that" throat-clearing? Cut to the point.
- Any "not X, it's Y" contrasts? State Y directly.
- Three consecutive sentences match length? Break one.
- Every paragraph ends with a punchy one-liner? Vary it.
- Em dash anywhere? Remove it.
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

Below 35/50: revise.

## References

- [references/phrases.md](references/phrases.md): throat-clearing openers, emphasis crutches, business jargon table, adverb kill-list, meta-commentary, vague declaratives.
- [references/structures.md](references/structures.md): binary contrasts, negative listing, false agency, narrator-from-a-distance, rhythm patterns.
- [references/examples.md](references/examples.md): before/after transformations.
