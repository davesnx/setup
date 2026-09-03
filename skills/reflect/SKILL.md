---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
argument-hint: "[focus]"
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

- The user said "reflect" or "/reflect".
- A complex task (5+ tool calls) just landed cleanly and the recipe is worth keeping.
- The agent hit dead ends, found the working path, and the path generalizes.
- The user corrected the agent's approach mid-task.
- A non-trivial workflow emerged that isn't captured anywhere.

Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript before fanning out. Stay inside the current workspace; never glob across other projects' transcripts, which reads private chats from unrelated work.

- **Claude Code:** `~/.claude/projects/<slug>/<session-id>.jsonl`, where `<slug>` is the absolute workspace path with every `/` replaced by `-` (leading slash included). Prefer the session in `CLAUDE_CODE_SESSION_ID` when the environment exposes it; otherwise take the most recently modified file. Subagent transcripts live under `<session-id>/subagents/` and are secondary sources.
- **OpenCode:** `~/.local/share/opencode/opencode.db`. Query the `session` and `part` tables read-only for the current `directory`, as described in the `recall` skill's history providers reference.
- **Other hosts:** use the host's session or history tool when one exists.

```bash
ls -t ~/.claude/projects/<slug>/*.jsonl 2>/dev/null | head -5
```

Confirm the candidate by checking that its first `user` record contains the conversation's opening prompt (the first line of a Claude Code transcript is metadata, not a message). If no transcript resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three general-purpose subagents launched together. Do not pass a model; reviewers inherit the session model (the lenses provide the diversity). Reviewers need tool access for context lookups (tickets, chat threads, observability traces referenced in the transcript), so use the ordinary agent type rather than a read-only one. The prompt forbids file writes; the parent applies edits.

| Lens | Prompt template |
|---|---|
| Judgment | `references/judgment-reviewer.md` |
| Tooling | `references/tooling-reviewer.md` |
| Divergent | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in their response body.

### 3. Synthesize

One general-purpose subagent using `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer's quality check includes spot-verifying citations, which can require tool access. It returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. The synthesizer already applies this criterion; this is a final pass before edits land.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future session on every harness that shares the skills directory; do not auto-apply.

Backlog items go to whatever backlog tracker the user names, or stay in the summary when there is none. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the `skill-creator` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `skill-creator` and run its description-optimization loop.
- `new skill: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

Run `skill-creator`'s `quick_validate.py` on every touched skill before declaring done.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog: `<title>`. One line each, with where it was filed.
- Dropped: one line per rejected finding + reason from the synthesizer.
