---
name: auto-improve
description: Use proactively when a host requests an auto-improve checkpoint, after repeated corrections or tool failures, or when a reusable workflow emerges. Propose improvements to skills, hooks, scripts, or agent rules and ask for approval before editing. Limit automatic reviews to one per session. Also use when explicitly asked to auto-improve. Not a general code audit or routine cleanup.
---

# Auto Improve

Use evidence from the current session to improve how agents work. Prefer a
check, hook, or script over another reminder when the rule can be enforced.

## Checkpoints

- Follow the host's checkpoint when one is supplied. The installed triggers
  count completed user replies, not tasks or tool calls. Finish the user's
  current task before a review attached to that task's input.
- Without a host trigger, review after three substantial completed tasks.
- Review sooner after repeated corrections or failures, or when a useful
  workflow is missing from the existing skills. Finish urgent work first.
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

1. Identify a repeated mistake, an explicit user correction with lasting value,
   or a verified workflow worth reusing. An isolated transient failure is not
   enough to justify a new standing rule.
2. Read the responsible skill, hook, script, configuration, and relevant tests.
   Check whether existing guidance was missed or an existing check was bypassed.
   Prefer fixing its trigger or connections over adding a duplicate.
3. Choose the smallest durable change in the right place. Use a skill for
   judgment or a reusable process; a hook for a lifecycle reminder or check;
   a script, lint rule, type, or runtime check for a rule that code can enforce.
   Read the host's actual hook interface before proposing hook behavior.

## Propose and Wait

Present at most three concrete proposals. For each, give:

- The observed evidence and the problem or repeated work it reveals.
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

## Apply Approved Changes

Re-read the target files and change only the approved proposals. Follow the
applicable skill-authoring or host-configuration workflow. Keep each rule in
one authoritative place and preserve unrelated user changes and rationale.

For executable checks, prove that the original failure is rejected and valid
behavior still works through the actual entry point. For hooks and scripts,
also test repeated events, partial failure, pending approval, and review-generated
events: none may cause duplicate prompts, unapproved edits, or a review loop.

For skill guidance, validate the format and check the instructions against the
observed failure, valid behavior, and a borderline case. State the acceptance
criteria and results; these checks do not prove future compliance.

Run the affected repository checks after the final edit. Report changed paths,
actual validation, and any reload requirement or remaining limit. Stop after
the approved changes; do not recursively call this skill or another reflection
workflow. Approval to improve files does not authorize commits, publication,
external tickets, or weaker safety checks.
