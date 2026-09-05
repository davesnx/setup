# Author patterns: David Sancho

David writes English as a second language (Spanish first). These are the
habits an edit pass fixes in his prose and the ones it leaves alone. Read
from the diff of sancho.dev PR #753, where the removed lines are his raw
prose and the added lines are corrections he reviewed and merged. Apply
after the generic catalogue in `SKILL.md`, on any text he wrote: sancho.dev
posts, docs, READMEs, messages. The standard the edit serves is
`VOICE.md` in the sancho.dev repository.

## Keep

Protected text. An unlisted quirk is not a defect; check it against this
list before touching it.

- "tbh", "lol", "(??)", "crap", "meme", "nightmare", "a tragedy".
- A two-word reaction standing alone: "Kind of amazing, tbh." The
  dropped-subject rows below are for sentences that carry information. A
  quip stands.
- One exclamation that closes a win per post: "and we have server-side
  rendering working!" The period is correct grammar and the wrong voice.
- One "Aside," as a paragraph opener per post. It is his "Aparte,". A second
  one becomes "Besides that,".
- "actually" when it corrects: "what actually works", "cram tests are nice,
  actually". This overrides pattern 43 in `SKILL.md`.
- "very", "a bit", "a little", "kind of", "some stuff here and there" when
  they appear once in a sentence and in a reaction, not inside a measured
  claim. Two of them in one sentence: cut one.
- "optimise" next to "organize". The spelling mix is his.
- Any construction that reads fine even if a native speaker would not have
  chosen it. "Empty in dune means very good" survived the pass.

## Grammar carried over from Spanish

| Pattern | Before | After |
|---|---|---|
| Dropped subject | "since needs to start a node process" | "because it needs to start a node process" |
| Dropped subject, whole paragraph | "Running the pre-rendering step during the build and serving them via our backend in OCaml." | "One option was to run the pre-rendering step..." |
| "since" as cause (23 removed, 3 kept) | "since it references itself" | "because it references itself". "since" marks time only |
| Agreement | "`reason-react` are a set of bindings", "does it holds true" | "is", "does it hold" |
| Articles | "a easy way", "An specific example", "the OCaml's package manager" | "an easy way", "A specific example", "OCaml's package manager" |
| Prepositions | "similar on what", "focusing in", "start by an uppercase letter", "contact me in Discord", "prefix all values by the module" | "similar to", "focused on", "start with", "on Discord", "with the module name" |
| Topic-first word order | "On the left side are defined all the possible `Variants`" | "The left side defines every possible `Variant`" |
| Double negation | "allows you to not spend energy" | "instead of spending energy" |
| Dangling "which" opening a sentence | "Which is a prompt that allows you to write which command you want to run" | "Depending on whether you use npm or yarn, the command either lists the scripts or opens a prompt." |

## Sentence and punctuation habits

| Pattern | Before | After |
|---|---|---|
| Comma-spliced run-on (the most frequent fix) | "I was a little frustrated by it and I created a small bash script that solves it, it's aliased to `run` in my local enviroment, take a look how it works:" | "I was a little frustrated, so I created a small bash script to solve it. It's aliased to `run` in my local environment, and it works like this:" |
| Parenthetical carrying a finite verb | "(might need to create a dune-project file at the root of your project if you don't have one already)" | Its own sentence. Short asides stay: "(??)", "(the small)" |
| Trailing line with no period, before a code block or at paragraph end | "Empty in dune, means very good" | "Empty in dune means very good." |
| Curly and straight quotes mixed in one file | "I’m" next to "I'm" | Straight quotes throughout |
| Hyphen drift | "micro-benchmark", "re-implementation", "build-time" (noun), "use-cases", "after-all", "lisp-y" | "microbenchmark", "reimplementation", "build time", "use cases", "after all", "Lisp-like". Keep "type-safe", "server-side", "real-world" before a noun |
| Casing of names | "dune" and "Dune" in one post, "node", "gatsby", "spanish" | Dune as subject, `dune` in commands; Node; Gatsby; Spanish; English |

## Word habits

| Pattern | Before | After |
|---|---|---|
| Wrong word that passes spellcheck | "Even thought" (3), "specially" (9), "thought" for "through", "defacto", "no-sense", "resilent" | "Even though", "especially", "through", "de facto", "nonsense", "resilient" |
| Typos he does not catch | enviroment, writting, finaly, comparision, transfomrations, benefitial, knwoing, ocassionaly, typechcker, programmig | Run a spellchecker on the draft first |
| Announcing the move instead of making it (6 "Let's" removed, 1 kept) | "Regardless, let's dive in", "Let's check the syntax with an example:", "Here's what you need to add to your `dune` file:" | Deleted; "For example:"; "Add this to your `dune` file:" |
| "just" as a minimiser (16 removed, 3 kept) | "We just apply the function" | "We apply the function". Keep "just" when it means "only" |
| "etc..." closing a list (11 removed, 3 kept) | "Header becomes `KeHeader`, Table becomes `KeTable`, etc..." | Name the items, or "and so on to avoid collisions." |
| Sentence-opening connector that connects nothing | "Aside,", "Regardless,", "In fact,", "Worth mentioning," | Delete, or "Besides that,". One "Aside," per post stays (see Keep) |
| Nominalised or empty verb | "This post provides an overview of some of the concepts", "Parsing is responsible for transforming", "gives the possibility to create" | "This post covers the library's concepts", "Parsing transforms", "makes it possible to create" |

## Editing pass

Run in this order, then stop. Each step subtracts or sharpens. Nothing is
added: no fact, name, number, first-person aside, joke, or fragment the
draft did not contain. A missing fact gets `[Q: ...]` in its place.

1. **Split comma-chained sentences.** "I'm a strong advocate of unit tests,
   I can confidently say that it has saved me..." becomes two sentences.
2. **Cut openers that only announce.** "Regardless, let's dive in", "in
   essence", "Notice that even here" are deleted or become "For example:".
3. **Cut "just" when it minimises; keep it when it means "only".**
4. **Unhook participle tails into a second sentence.** "...eliminate runtime
   overhead, making `html_of_jsx` between 2x and 12x faster and some
   assumptions..." becomes two sentences.
5. **Name the effect with the verb that does it.** ensure, provide, allow,
   enable, facilitate, help, "make it possible to" are flags. "ensures your
   tests will run consistently" becomes "keeps your tests consistent".
6. **Put the evidence in the subject.** "With the tree model, we're forced
   to allocate" becomes "The tree model forces us to allocate". "The true
   testament to cram tests' effectiveness is their adoption by..." becomes
   "Prominent projects adopted cram tests, which shows...".
7. **A parenthetical with a finite verb becomes its own clause.** "(with
   server-reason-react and html_of_jsx)" becomes ", with server-reason-react
   and html_of_jsx,". "(??)" stays.
8. **Fix grammar, keep the person.** Fix agreement, articles, tense, word
   order that misparses, "since" for "because", the wrong-word slips above.
   Then reread the Keep list and confirm every protected quirk is still in
   place.
