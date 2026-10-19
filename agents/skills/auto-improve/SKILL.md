---
name: auto-improve
description: Use proactively when a host requests an auto-improve checkpoint, after a lasting user correction, a reviewer finding of an agent mistake, or repeated misunderstandings or tool failures, or when a reusable workflow emerges. Reactions such as "what was that?" count as corrections. Also use when explicitly asked to auto-improve. Not a general code audit or routine cleanup.
---

# Auto Improve

Use evidence from the current session to improve how agents work. Prefer a
check, hook, or script over another reminder when the rule can be enforced.
Give priority to the user's corrections: learn what the agent misunderstood
and what the user wanted instead.

## Checkpoints

- Follow the host's checkpoint when one is supplied. The installed triggers
  count completed user replies, not tasks or tool calls. Finish the user's
  current task before a review attached to that task's input.
- Without a host trigger, review after three substantial completed tasks.
- Review sooner after a correction with clear lasting value, repeated
  misunderstandings or failures, or a useful workflow missing from the existing
  skills. Resolve the user's current correction before reviewing it.
- Allow at most one automatic review per session, including checkpoints with
  no useful proposal. Explicit user requests can run further reviews.
- Review only new evidence. While a proposal awaits an answer, do not ask
  again. Respect a decline; revisit it only if the user asks or evidence changes.
- A skill is not a timer. These are agent instructions; reliable scheduling
  requires a host hook, plugin, or scheduler. Treat a due marker as one
  checkpoint, not permission to edit or to schedule another review.

For installed trigger behavior, state, and disabling instructions, see
[the setup reference](../../README.md#automatic-improvement-reviews).

## Review

Keep this pass read-only. Use the current session and relevant files; do not
search unrelated conversations or projects for lessons.

1. Identify a repeated mistake, a correction with lasting value, or a verified
   workflow worth reusing. Classify each correction as described below; a
   one-off slip does not justify a new standing rule.
2. Read the responsible skill, hook, script, configuration, and relevant tests.
   Check whether existing guidance was missed or an existing check was bypassed.
   Prefer fixing its trigger or connections over adding a duplicate.
3. Choose the smallest durable change in the right place. Use a skill for
   judgment or a reusable process; a hook for a lifecycle reminder or check;
   a script, lint rule, type, or runtime check for a rule that code can enforce.
   Read the host's actual hook interface before proposing hook behavior.

## Learn from Corrections

A correction comes from the user or from a reviewer, human or agent, whose
finding appears in the session, such as a pasted pull request comment or a
reviewer agent's output. Treat a reviewer finding as a correction only when the
code or the user confirms the agent's mistake.

Classify each correction:

- **Behavior rule**: the agent knew enough but acted against the user's
  intent or a stated rule.
- **Knowledge gap**: the agent lacked a correct model of a language, compiler,
  library, or tool. Example: it did not know that Melange compiles a record
  literal to a JavaScript object literal, so a record built during render is a
  new object each render and changes identity in a React effect's dependencies. One knowledge gap justifies a
  proposal; see [Knowledge Gaps](#knowledge-gaps).
- **One-off slip**: a typo or oversight that existing knowledge and rules
  already cover. It needs no proposal.

Read corrective messages with the request, agent action, and follow-up around
them. Short reactions such as "what?", "what was that?", or "that's not what
I asked" can expose a misunderstanding. Interpret their meaning in context,
including typos; do not use them as keyword triggers or infer a preference
from frustration alone. An ordinary question asking for an explanation is
not evidence of an agent mistake.

For each useful correction:

1. Identify the mismatch between the user's request and the agent's answer or
   action. Use a short user quote and the relevant action as evidence.
2. State the replacement behavior supported by the user's correction, edits,
   or explanation. If the intended behavior is unclear, ask a focused question
   through the host's result destination rather than inventing a lasting rule.
3. Separate a task-specific correction from a lasting preference. One explicit
   instruction such as "for future reviews, lead with the findings" can justify
   a proposal. An inferred preference needs repeated evidence and confirmation.
   Keep one-time exceptions scoped to the task. Do not infer personality traits.
4. Check existing guidance before adding anything. If the rule already exists,
   investigate why the agent missed it. Propose a change to its wording,
   trigger, or enforcement only when the evidence supports that change.

Also use explicit approval or the user's reason for choosing an approach to
identify behavior worth repeating. Silence, "continue", and passing tests do
not establish user preference. Technical success and user approval are separate
evidence.

Save approved lessons in the instructions that govern the work: shared agent
rules for general preferences, the relevant skill for task-specific methods,
or project instructions for local decisions. Keep one authoritative rule;
do not create a separate user profile or copy transcripts into instructions.
Approval to correct the current task is not approval to save a lasting lesson.

At later checkpoints, compare new evidence with relevant saved lessons. Check
whether the agent followed the rule, whether the user had to repeat the
correction, and whether the rule was too broad. Propose replacing conflicting
or outdated guidance instead of adding another rule. Use only available
evidence; do not claim improvement across sessions without observed outcomes.

## Knowledge Gaps

The fix for a knowledge gap is knowledge in a skill, not a rule about the one
case. Propose it as follows:

1. Abstract the case to the general knowledge the agent lacked. For the
   Melange example, that is how each OCaml construct compiles to JavaScript,
   not the fix for one effect.
2. Search the existing skills for one that owns this area. Extend it when it
   does; propose a new skill only when none fits.
3. List the open questions the skill must answer and how each will be
   settled, in this evidence order:
   1. Compile or run a minimal snippet and read the output. This is the
      strongest evidence.
   2. Primary documentation: context7, official docs, or web search.
   3. Ask the user.

The review stays read-only. The research runs after approval, in
[Apply Approved Changes](#apply-approved-changes).

## Propose and Wait

Present the concrete proposals the session's evidence supports, strongest
first, in a set the user can answer in one pass. For each, give:

- The observed evidence and the problem or repeated work it reveals.
- For a user lesson, the replacement behavior, its scope and exceptions, and
  whether the user stated it explicitly or it still needs confirmation.
- For a knowledge gap, the general knowledge, the target skill, and the open
  questions with their planned evidence.
- The target path, proposed change, and why that location fits.
- The verification check and any wider effect, such as cross-project behavior,
  added model calls, or startup dependencies.

Use the host's result destination. An independent review keeps proposals in
its own session; do not send them into the source conversation. A delegated
subagent that returns to its parent supplies the proposals for that parent to
relay and ask which to apply. In a normal interactive review, ask directly and
stop for the user's answer. General task edit authority, loading this skill,
or receiving a hook reminder is not approval to change the agent setup.
Honor review-only and plan-only requests.

If no proposal earns a change, finish quietly for an automatic checkpoint.
Use the host's no-proposal response when one is specified.
For an explicit request, say that no useful change was found and why.

## Close the Report

When the user decides on a report in `auto-improve/claude` under
`${XDG_STATE_HOME:-$HOME/.local/state}`, archive it: append
`outcome: applied|dismissed|duplicate <path or reason>` and move the file to
`archive/` there. Only reports outside `archive/` count as unread. Archive
only on the user's decision.

## Apply Approved Changes

Re-read the target files and change only the approved proposals. Follow the
applicable skill-authoring or host-configuration workflow. Keep each rule in
one authoritative place and preserve unrelated user changes and rationale.

For executable checks, prove that the original failure is rejected and valid
behavior still works through the actual entry point. For hooks and scripts,
also test repeated events, partial failure, pending approval, and review-generated
events: none may cause duplicate prompts, unapproved edits, or a review loop.

For a knowledge gap:

1. Settle each open question in the evidence order from
   [Knowledge Gaps](#knowledge-gaps). Run snippets in the session scratchpad.
   Write a claim into the skill only after evidence supports it, and record
   the command or source for each claim in the skill's references.
2. Add an eval case built from the original failure: given the failing code,
   an agent with the skill must flag the problem.
3. Check the original correction against the current code. Report when it no
   longer holds or never held.

For skill guidance, validate the format and check the instructions against the
observed failure, valid behavior, and a borderline case. State the acceptance
criteria and results; these checks do not prove future compliance.

Run the affected repository checks after the final edit. Report changed paths,
actual validation, and any reload requirement or remaining limit. Stop after
the approved changes; do not recursively call this skill or another reflection
workflow. Approval to improve files does not authorize commits, publication,
external tickets, or weaker safety checks.
