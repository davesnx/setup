# Author patterns: David Sancho

David writes English as a second language (Spanish first). These are the
habits an edit pass fixes in his prose and the ones it leaves alone. Based
on the diff of sancho.dev PR #753, with suggested alternatives for the
context-dependent cases below. The alternatives are not a record of
author-approved wording. Apply
after the generic catalogue in `SKILL.md`, on any text he wrote: sancho.dev
posts, docs, READMEs, messages. The standard the edit serves is
`VOICE.md` in the sancho.dev repository. These edits are contextual examples,
not universal grammar rules or targets for future posts. Preserve uncertainty,
scope, speaker, and meaning when applying a correction.

## Keep

Protected text. An unlisted quirk is not a defect; check it against this
list before touching it.

- "tbh", "lol", "(??)", "crap", "meme", "nightmare", "a tragedy".
- A short reaction standing alone: "Kind of amazing, tbh." The
  dropped-subject rows below are for sentences that carry information. A
  quip stands.
- An exclamation that expresses a real win: "and we have server-side
  rendering working!" Keep his enthusiasm without a per-post quota.
- "Aside," as a paragraph opener when it introduces an aside. It is his
  "Aparte,". Judge its function, not how often it appears.
- "actually" when it corrects: "what actually works", "cram tests are nice,
  actually". This overrides pattern 43 in `SKILL.md`.
- "very", "a bit", "a little", "kind of", "some stuff here and there" when
  they carry a reaction, degree, or uncertainty. Cut repetition only when it
  adds no meaning; a count alone is not a reason to edit.
- "optimise" next to "organize". The spelling mix is his.
- Any construction that reads fine even if a native speaker would not have
  chosen it. "Empty in dune means very good" survived the pass.

## Grammar carried over from Spanish

| Pattern | Before | After |
|---|---|---|
| Dropped subject | "since needs to start a node process" | "since it needs to start a node process". The missing subject is the error; use "because" if it makes the cause clearer |
| Dropped subject, whole paragraph | "Running the pre-rendering step during the build and serving them via our backend in OCaml." | "One option was to run the pre-rendering step..." |
| Agreement | "`reason-react` are a set of bindings", "does it holds true" | "is", "does it hold" |
| Articles | "a easy way", "An specific example", "the OCaml's package manager" | "an easy way", "A specific example", "OCaml's package manager" |
| Prepositions | "similar on what", "focusing in", "start by an uppercase letter", "contact me in Discord", "prefix all values by the module" | "similar to", "focused on", "start with", "on Discord", "with the module name" |
| Topic-first word order | "On the left side are defined all the possible `Variants`" | "The left side defines every possible `Variant`" |
| Indirect wording, not a grammar error | "allows you to not spend energy" | "lets you avoid spending energy", if it keeps the intended meaning |
| Dangling "which" opening a sentence | "Which is a prompt that allows you to write which command you want to run" | "It is a prompt where you enter the command you want to run", when "It" has a clear referent |

## Sentence and punctuation habits

| Pattern | Before | After |
|---|---|---|
| Comma-spliced run-on (the most frequent fix) | "I was a little frustrated by it and I created a small bash script that solves it, it's aliased to `run` in my local enviroment, take a look how it works:" | "I was a little frustrated by it. I created a small bash script that solves it. It's aliased to `run` in my local environment. Take a look at how it works:" |
| Parenthetical that interrupts the explanation | "(might need to create a dune-project file at the root of your project if you don't have one already)" | If clearer separately: "You might need to create a dune-project file at the root of your project if you don't have one already." Keep clear asides, including ones with verbs |
| Trailing line with no period, before a code block or at paragraph end | "Empty in dune, means very good" | "Empty in dune means very good." |
| Curly and straight quotes mixed in one file | "I’m" next to "I'm" | Match the document's convention when consistency helps; preserve literal quotations and code |
| Hyphen drift | "micro-benchmark", "re-implementation", "build-time" (noun), "use-cases", "after-all", "lisp-y" | "microbenchmark", "reimplementation", "build time", "use cases", "after all", "Lisp-like". Keep "type-safe", "server-side", "real-world" before a noun |
| Casing of names | "dune" and "Dune" in one post, "node", "gatsby", "spanish" | Dune as subject, `dune` in commands; Node; Gatsby; Spanish; English |

## Word habits

| Pattern | Before | After |
|---|---|---|
| Wrong word that passes spellcheck | "Even thought" (3), "specially" (9), "thought" for "through", "defacto", "no-sense", "resilent" | "Even though", "especially", "through", "de facto", "nonsense", "resilient" |
| Typos he does not catch | enviroment, writting, finaly, comparision, transfomrations, benefitial, knwoing, ocassionaly, typechcker, programmig | Run a spellchecker on the draft first |
| Announcing the move instead of making it (6 "Let's" removed, 1 kept) | "Regardless, let's dive in", "Let's check the syntax with an example:", "Here's what you need to add to your `dune` file:" | Deleted; "For example:"; "Add this to your `dune` file:" |
| "just" as a minimiser (16 removed, 3 kept) | "We just apply the function" | "We apply the function". Keep "just" when it means "only" |
| "etc..." closing a list (11 removed, 3 kept) | "Header becomes `KeHeader`, Table becomes `KeTable`, etc..." | "Header becomes `KeHeader`, Table becomes `KeTable`, and so on." Name further items only when the source supplies them |
| Sentence-opening connector that connects nothing | "Aside,", "Regardless,", "In fact,", "Worth mentioning," | Delete only when it adds no connection or meaning. Keep a genuine aside (see Keep) |
| Nominalised or empty verb | "This post provides an overview of some of the concepts", "Parsing is responsible for transforming", "gives the possibility to create" | "This post covers the library's concepts", "Parsing transforms", "makes it possible to create" |

## Editing pass

Check in this order; edit only when the passage needs it. Each edit subtracts
or sharpens without imposing a sentence pattern. Nothing is
added: no fact, name, number, first-person aside, joke, or fragment the
draft did not contain. A missing fact gets `[Q: ...]` in its place.

1. **Split comma-chained sentences.** "I'm a strong advocate of unit tests,
   I can confidently say that it has saved me..." becomes two sentences.
2. **Cut openers that only announce.** "Regardless, let's dive in", "in
   essence", "Notice that even here" are deleted or become "For example:".
3. **Cut "just" when it minimises; keep it when it means "only".**
4. **Split participle tails when they obscure meaning.** "...eliminate runtime
   overhead, making `html_of_jsx` between 2x and 12x faster and some
   assumptions..." can become two sentences, keeping the measurement and
   its causal limits.
5. **Name the effect with the verb that does it.** ensure, provide, allow,
   enable, facilitate, help, "make it possible to" are prompts to inspect,
   not automatic replacements. "Parsing is responsible for transforming"
   can become "Parsing transforms". Keep distinctions between helping,
   enabling, and guaranteeing an outcome.
6. **State the evidence without inflated praise.** "With the tree model,
   we're forced to allocate" is already a concrete explanation. "The true
   testament to cram tests' effectiveness is their adoption by..." becomes
   "Cram tests were adopted by...", retaining the named projects and any
   supported inference, without adding a reputation claim.
7. **Keep readable parentheticals.** Use a separate sentence when an aside
   interrupts the explanation, not merely because it contains a verb.
   "(with server-reason-react and html_of_jsx)" and "(??)" can stay.
8. **Fix grammar, keep the person.** Fix agreement, articles, tense, word
   order that misparses, and the wrong-word slips above. Causal "since" is
   valid; use "because" only when it removes ambiguity.
   Then reread the Keep list and confirm every protected quirk is still in
   place.
