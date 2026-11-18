---
name: implement
model: claude-opus-5-5
description: "Implement app work from a spec, tickets, or an issue, then commit it. For library, compiler, or tool work, use `tdd` Implement mode."
disable-model-invocation: true
---

Implement the work described in the spec, tickets, or issue the user names.

## Input

Read the named source first: a spec, a ticket, an issue, `.workplace/plans/<slug>_SPEC.md`, or the tickets in `.workplace/plans/<slug>/`. If none exists, stop and say so. Do not invent requirements.

Take only tickets whose blockers are done. A ticket is done when its criteria and its verify command pass. Then set its local Status to done, or close the issue.

## Work

Call the Skill tool with "tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

For a bug fix or a measurable claim, call the Skill tool with "verify-this".

## Stop and report

- a check fails and you cannot fix it
- the spec is ambiguous, or silent on a decision the work needs
- a step cannot be undone

## Finish

Commit through the `github` skill. Its commit flow runs the one code review.

End with a report: criteria met, checks run with results, tickets closed, anything skipped.
