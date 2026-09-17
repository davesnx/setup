---
name: writing-voice
description: "Target voice for David's blog posts, essays, and talk scripts. Load when drafting, editing, or reviewing one. Not for documentation, PR or commit text, or X posts."
---

# Writing voice

The voice a finished post should have. Use it as the target when drafting,
editing, or reviewing. A repository may also hold a `VOICE.md` at its root
with the author's own corrections and examples; that file refines this one
for that repository and never replaces it. Examples below are lines from
published sancho.dev posts. Use them to recognise the move, not as text to
reuse.

## The one clear thing

Write as a practitioner talking to a peer about something you actually did.
Credibility comes from the thing shown, not from your position.

- The polemic proves every point with side-by-side code.
- The confession shows the actual mistake, the actual revert, the actual
  regret.
- The tutorial hits a real bug first and names the pattern last.

If a sentence could have been written by someone who was not there, cut it or
replace it with the thing you saw.

## Always

### Concrete, checkable evidence carries the argument

Every claim rests on something the reader can inspect.

- Real code, shown in full, often as a before and after pair.
- Real tool output: compiler errors, terminal sessions, benchmark tables.
- Real numbers from your own system: "it's very slow (around 250ms!) because
  it needs to start a node process, parse the json file, and send output to
  stdin".
- Real screenshots or file listings, placed before the prose that explains
  them.
- Named sources, linked: a tweet, a colleague, a paper, a prior post.

The abstraction follows the evidence. It never comes first.

### Peer stance, never lecturer

You are the person who was there, not the expert looking down. This holds
even when you have real standing.

- "I'm not trying to convince you to learn or try those languages. I want to
  share something I built and care about."
- "I'm not a teacher. I don't have 10+ years of experience in OCaml or a PhD,
  and, more terribly, I didn't finish my Computer Science degree."

The image to keep: a colleague at a whiteboard, a friend explaining what
worked, a fellow sufferer who found a fix.

### Pronouns with a fixed division of labor

- "I" for what you did, saw, chose, and think.
- "You" for instruction and for the reader's own situation.
- "We" for reasoning through a problem together, or for a team speaking as
  one in an announcement.

A post that is all "you" reads as a manual. A post that is all "I" leaves the
reader out.

### No summary paragraph at the end

Close on a device that does work. Restating the argument in prose is the one
ending to avoid.

- An imperative that echoes the title.
- An invitation: "If you have ideas for more optimizations, I'd love to hear
  them".
- An artifact: a copyable template, an install command, a demo link.
- A credits list: "Thanks to everyone who reviewed this blog post: Javi,
  Enric, and Gerard."
- A caveats section, such as "Why you should not use it", that tempers the
  enthusiasm just built.
- An open question, a one-word verdict, or a sign-off: "Happy testing
  folks!"

A long multi-principle piece may recap, but as a scannable list with anchor
links, never as a closing paragraph.

### Direct where you know, explicitly unsure where you don't

Main claims are flat and unhedged. Uncertainty is stated once, plainly, at
the exact point it applies, and nowhere else.

- Flat: "Don't use Tailwind for your design system, UI framework, or
  component system, whatever you prefer to call it."
- Placed: "in my case", "as far as I know", said once where it matters.
- Never: "I think maybe" spread across the whole piece.

Self-deprecation often does the job hedging would.

### Segmented structure

Cut the page into pieces the reader can scan: headings that narrate stages
or state claims, numbered principles, one bolded thesis per section,
isolated one-line paragraphs, bullet lists for parallel items. Only a short
post under 800 words may run as plain prose.

## Usually

### Your own mistake is the evidence

Show a failure, a wrong turn, or a reversed opinion: a bug shipped twice, a
revert requested the next morning, an approach that lost to a simpler one,
an investigation that ends unsolved. "Most "obvious" improvements turn out
to be slower, equivalent, or only faster in edge cases." A section named
"Detours: ideas that didn't work out" is worth more than a clean path.
"I used to believe X, now I believe Y" is a reusable shape.

### The reader's objection, voiced then answered

Quote what the reader is thinking, then reply. "Why should you listen to
me?" "The question I heard most while implementing this was about
performance." A "Downsides" section states the counterpoint; the voiced
objection answers the reader.

### Rhetorical questions as hinges

Open a section or turn the argument with a question, then answer it at once.
"How hard could it be?" A heading like "Does syntax matter for LLMs?" earns
its next line.

### Credit given by name

Name the people whose ideas you build on, with links: a tweet embedded as
validation, a "Thanks to:" list, a footnote crediting the writer who said it
first. Projects are not people; link both.

## Free choices

Pick per post. None of these define the voice.

- Humor and self-deprecation versus a flat serious register.
- Code blocks as the vehicle versus prose, lists, or screenshots.
- Citing outside writers versus standing only on your own experience.
- A narrative scene versus a flat list.
- Jargon level, which tracks the intended reader.
- Emoji, always sparse, at the end of a payoff line.

## Structure

### Length

Aim for 600 to 2500 words. Let the evidence set the length: one trick takes
400 words, a teardown takes several thousand. Do not pad to reach a number.

### Title

Short and plain, often a complete claim, two to six words when possible.

- **A claim as a sentence.** "Don't use Tailwind for your Design System".
- **First person, stating the stake.** "How I solve hard problems".
- **A question the post answers.** "What do we lose moving from Reason to
  mlx?"
- **A concrete specific.** "Making html_of_jsx ~10x faster".
- **A plain name with its hook.** "query-json: jq written in Reason", "Run
  yarn/npm scripts with fzf".

Avoid numbered listicles, "The Ultimate Guide to", "A Deep Dive into", and
"Everything You Need to Know". Use a colon only when the post is literally a
series entry or an RFC.

### Description

The frontmatter description is the claim or the punchline in one line, not a
summary of what the post will cover.

- The claim with your stake: "I reimplemented jq in Reason; compiled it to a
  native binary and to a JavaScript library".
- The hook: "What Reason gives us beyond "just JSX"".
- The offer: "A small trick I use to run yarn/npm scripts faster".

Not: "Tutorial on how to", "This article explains", "In this post we will",
a topic list, or "TBD".

### Opening

The stake is in the first one to three sentences. No throat-clearing, no "In
this post I will", no "This post covers".

- **The claim, first sentence.** "Don't use Tailwind for your design system".
- **A cold question.** One line, then the answer begins.
- **A scene.** Past tense, no framing: what happened, then what you did.
- **A personal timeframe with the stake.** Years at a company, months on a
  project, then why that matters here.
- **The occasion for writing.** Someone asked; something shipped today.
- **A confession of prior bias.** "I'm not a great fan, but integrating it
  into web applications built with Melange or any other dune-based system
  is surprisingly easy."
- **A short scoping note** when the reader must know who this is for.

Where a plan is stated, it is one sentence.

### Body shapes

Pick one and keep it.

1. **Story, reversal, lesson.** A scene in past tense, a hinge heading that
   undercuts it, then a short essay drawing the general point.
2. **Claim, numbered reasons, alternative, credit.** The boldest one-line
   claim, mirrored "Problem 1..3" and "Benefit 1..3", a named alternative
   with code, then who thought of it first.
3. **Build-up tutorial.** Broken code, the error, the smallest fix, a new
   wrinkle, the next fix, then the name of the pattern, then "do you really
   need this?"
4. **Numbered principles or lessons.** Each heading is a complete aphoristic
   sentence and its own thesis, with two to five short paragraphs under it.
5. **Announcement.** What it is in one sentence, why you built it, how to use
   it, what is not ready, thanks, where to send feedback.
6. **Retrospective.** Context and credentials, then "Regret N" or a before
   and after pair, each closing on a bolded lesson, then a takeaways list.
7. **Note.** Almost no prose: a checklist, a template in a code block, or
   borrowed quotes with one-line glosses.

### Headings

Headings narrate or claim. They are not topic labels.

- Stages: "The baseline", "Rethinking the model", "Detours: ideas that
  didn't work out".
- Questions: "Does syntax matter for LLMs?", "What's server-reason-react?"
- Claims and caveats: "Why you should not use it".
- Mirrored pairs: "Why it's good" then "Why it's bad".
- Numbered series: "Principle 1", "Regret 2", "Issue #3".

Not: "Introduction", "Prerequisites", "Conclusion", or a bare noun.

### Evidence devices

- One worked example that evolves through the whole post: the same
  component refactored five times, the same type broken then fixed twice.
- Before and after pairs, code or image, side by side for the reader to
  judge.
- Code that argues on its own: a wall of classes shown unreadable before
  any prose says so.
- Prose refers to each code block and reacts right after. Code is a
  sentence in the argument, not a figure.
- Footnotes hold caveats, jokes, and tangents. A mid-post "Update:" that
  corrects a number stays visible.

### Closing

See "No summary paragraph at the end". The last line is an imperative, an
invitation, an artifact, credits, caveats, an open question, a one-word
verdict, or a personal aside.

## Rhythm

### Sentences

- Short declarative sentences dominate. A long sentence appears only to
  explain a mechanism, then the next one is short again.
- Length tracks function. Narrative runs short. Reflection and mechanism
  run long. The switch should be audible.
- Fragments are allowed as beats. Reactions after evidence are one word or
  one line: "Empty in dune means very good."
- A colon sets up code: "With this setup, `dune build` handles..."

### Paragraphs

- One to three sentences is the norm. A paragraph past five sentences needs
  a reason.
- Isolated one-line paragraphs mark the beats: "Hear me out." "I had an
  idea."
- Anaphora builds a list inside prose: several paragraphs in a row opening
  with the same words.

### Tense

- Present for how a thing works, for general claims, and for advice.
- Past for the personal story and for what happened when you ran it.
- The switch between them marks narrative versus analysis without a heading.
- Future or conditional only for what is not shipped yet.

### Emphasis

- Bold marks one sentence per section, the one to walk away with. Never a
  whole paragraph, never scattered single words.
- Italics mark the single word under interrogation.
- Parentheticals carry caveats and jokes mid-sentence.
- Ellipsis for comic timing, once or twice per post. Emoji, when used, sit
  at the end of a payoff line and never replace a word.

### Pace of a section

Pose the problem in a question. Show the attempt. Show the output. React in
one line. Move on. Tutorials repeat this beat every section. Essays repeat a
looser form: claim, evidence, one-line compression of the claim in different
words.

## Do and Don't

**Do**

- Start from a specific thing you did, saw, or broke, and show it in full.
- Speak as the person who was there, not the expert on the topic.
- Put the claim or the stake in the first three sentences.
- Give each section one job, one bolded sentence, and one piece of evidence.
- State the main claim flat. State uncertainty once, where it applies.
- Voice the reader's objection in their words, then answer it.
- Name who thought of it first, with a link.
- End on an action, an invitation, an artifact, or a caveat.

**Don't**

- Don't open with context the reader did not ask for.
- Don't argue from an abstraction you have not shown an instance of.
- Don't hedge a claim about something you built and use daily.
- Don't add a summary paragraph. "I hope this post helps. No tool is
  perfect, but understanding tools helps us use them wisely." is the
  ending to cut.
- Don't head a section "Conclusion" or "Prerequisites".
- Don't write a description that starts "Tutorial on how to".
- Don't claim an idea as yours when a named writer said it first.
- Don't claim a universal win without the footnote on where it fails.
- Don't write a title with a number, a colon, or "guide" in it unless the
  post is literally a numbered series or an RFC.
