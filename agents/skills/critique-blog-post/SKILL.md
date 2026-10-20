---
name: critique-blog-post
description: "Review blog outlines and posts for contradictions, repetition, unsupported claims, and reader gaps. Supports fresh-reader tests. Report findings without editing."
---

# Critique a blog post

Read as a reader who does not know the conversation behind the post. Find issues
that change what the reader understands or believes, and explain how to fix them.
The output is a review, not a rewritten article.

## 1. Read the whole post

Read the supplied outline or article end-to-end, relevant `VOICE.md` if present,
supplied or clearly identified author samples, and sources needed to assess its claims.
Use the requested voice and samples to distinguish deliberate choices from defects.
Read
[references/review-framework.md](references/review-framework.md) for the review.
Use the stated audience or explain the audience you infer. An outline can be
reviewed for argument and order without requiring finished paragraphs.
Judge whether the piece serves that reader and its purpose. Engagement techniques
are options, not requirements for a sound technical explanation or personal essay.

Review directly. Ask only when missing material prevents a useful review; a
complete post does not require an interview. Keep the source file unchanged.

## 2. Find and verify issues

Check the whole post, including its title, captions, code, and ending:

- **Promise and delivery:** Does the body answer the opening's question? Does the
  conclusion follow, or introduce a claim the body has not earned?
- **Consistency:** Do statements, dates, numbers, definitions, or examples conflict?
  Quote both sides of a suspected contradiction and check whether scope explains it.
- **Repetition:** Does a passage repeat a point without adding evidence, a condition,
  or a consequence? Distinguish useful reminders from duplicate argument.
- **Order and clarity:** Are ideas introduced before they are used? Does each
  section have a purpose and give the reader what the next section needs?
- **Support:** Are claims as narrow as their evidence? Check named sources before
  treating them as proof. Separate factual error from an unverified claim.
- **Voice and density:** Does the prose sound like the author? Are there vague
  claims, forced drama, unexplained jargon, or sentences with no useful content?
- **Art and code:** Do examples and assets explain their claimed point? Check
  captions, units, inputs, and output. Identify missing or untested material.

For each finding, identify the passage, the reader impact, and the smallest useful
change. Verify that nearby text does not already answer the objection. Report
style preferences as preferences, not errors. Do not invent findings to fill a quota.

## 3. Report

Lead with the most important findings. For each, give:

1. Location and short quote (both locations for contradiction or repetition).
2. The issue and why it matters.
3. A concrete repair: cut, merge, move, clarify, qualify, add evidence, or rewrite.

Separate confirmed issues, claims needing verification, and optional style changes.
Include brief proposed wording when it makes a repair clear, preserving the claim
and its limits. Finish with the main remaining risk or say when no material issue
was found. Avoid a scorecard and generic praise.

The review is complete when each reported issue has textual or source evidence,
the whole post has been checked, and verification limits are explicit. A critique
does not authorize file edits. If the author asks to apply repairs, use
`write-polish-blog-post`; use `create-drafted-blog-post` for a requested rethink of
the story and outline.

## Fresh-reader test

When requested, predict 5–10 questions the target reader needs the post to answer.
Give a fresh subagent only the post, audience, and questions. Tell it to read as
a stranger to the author and site, answer from the post, and report ambiguity,
assumed knowledge, unsupported conclusions, and unanswered questions. Do not pass
interview notes or conversation history. Require read-only work with no Git writes.

Compare its answers with the text and report confirmed gaps. Keep fixes as
recommendations until authorized. After an authorized revision, retest the affected
questions. The test passes when important questions are answered correctly and
material ambiguity or contradictions are resolved. If subagents are unavailable,
provide a prompt for a fresh conversation and state that the test was not run.

## Sources

The review framework adapts the former local blog-writing skill and
[compound-writing](https://github.com/everyinc/compound-writing) (MIT).
Fresh-reader testing adapts Anthropic's `doc-coauthoring`.
