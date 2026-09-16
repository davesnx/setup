---
name: to-spec
description: Synthesize agreed facts into a spec without an interview; draft or publish as requested.
disable-model-invocation: true
argument-hint: "[title]"
---

Produce a spec from supported, agreed facts in the conversation and relevant codebase evidence. Do not interview the user or turn proposals into decisions. Record unresolved points as open questions in the spec, not questions that block drafting.

Read `docs/agents/issue-tracker.md` when it exists. Otherwise infer the tracker from the repository remote. Preserve known tracker and label requirements. If the destination or required label mapping remains unknown, return the draft and report the publication blocker; do not invent or create a ready label.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Record agreed interfaces and testing decisions. Use existing public interfaces where supported by the agreement and code. Leave unresolved design choices open; drafting does not require test-seam approval.

3. Write the spec using the template below, including only supported content. Return a draft when requested or when publication is not authorized. Publish only with user authorization for the target tracker and with its known required labels. Report the actual result: the created issue URL on success, or the draft and error/blocker on failure. Do not claim publication from intent or a failed command.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of user stories supported by the agreed scope. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

Omit this section if no user stories are supported. Do not add actors, features, or benefits to fill the template.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Where supported, include:

- Observable behavior to verify through public interfaces
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Supported context and unresolved points, clearly separated from agreed decisions.

</spec-template>
