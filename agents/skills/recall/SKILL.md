---
name: recall
description: "Reconstruct recent working context from chat history, repository state, and shared records like issues and incidents. Use for 'recall my work on X', 'catch me up', 'where did I leave off', 'what did we decide', 'resume work on X', or to summarise past conversations."
---

# Recall

**Before you start or resume work, you rebuild the user's recent working context and hand back a tight capsule of where things stand now and what to do next.** Common requests include "catch me up", "remind me what we discussed", "what did we decide", "what happened with X", and "pick up where we left off".

Keep it tight and on-topic. Read only what the in-scope threads need, then stop. The heavy reading fans out to parallel subagents. The main thread keeps only their findings and the final brief.

Your context lives in two records. Chat history holds what you did and decided. The shared record holds what happened around the same code: user reports, fixes that shipped or were reverted, open pull requests, incidents, and errors still firing in production. A feature with a long bug tail keeps much of its story outside transcripts, so do not reconstruct it from chat alone.

Read [references/history-providers.md](references/history-providers.md) before searching chat history. It defines the OpenCode database, Cursor transcript, and generic host-provider workflows.

1. Classify the request. For one named conversation, use a narrow single-session search. For a topic or activity window, reconstruct across matching sessions. If the user already gave you a full state capsule with paths, branch, and current change, use it and skip history mining.
2. Lock the scope before searching. Pin the window ("recent" is a real range, default the last 7 days), the topic if named, and the workspace (default the active one; never read another project's transcripts without being asked). State the scope back. Never quietly turn "all" into "recent N".
3. Search available chat providers. For one or two candidate conversations, search directly. For a larger corpus, give parallel read-only subagents separate candidate slices. Each returns one block per conversation: topic, user goal, decisions, open threads, struggles and corrections, and artifacts such as PRs, tickets, and branches, with a session or transcript ID citation. Raw transcripts stay out of the main thread.
4. Sweep the shared record whenever the topic names a feature, file, subsystem, area, or bug. Search source control, PR and issue history, project docs, available team chat, incidents, and error tracking in parallel when those sources exist. Ask each source the same question: what is current, what was tried and failed, and what users still report. A null result is useful; an unavailable source is reported and skipped. Skip this sweep only for pure activity recall with no named target.
5. Verify against live state. A transcript or a stale ticket is history, not current truth, so take the PRs, branches, and tickets that the mining and the sweep surfaced and check them with `git` and `gh`. When the answer hinges on what an agent actually did (the tools it ran, files it read, errors it hit), read the full transcript, not just a trimmed local copy.
6. Write the brief to the contract below. Group by thread. Stay on the named topic.

## Output contract

Lead with the capsule, then the thread status, then the problems, then the next move. Deeper detail goes below or gets cut.

- **Capsule.** At most 5 bullets. What this work is and where it stands overall.
- **Threads.** One line each, prefixed with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`. A thread with no tag is not done yet, so tag it.
- **Problems.** At most 5, the recurring ones. Include the symptoms users keep reporting and any fix that shipped and was reverted, so the next attempt starts where the last one failed.
- **Next move.** The single most useful next action, concrete.

An adjacent feature or ticket stays out unless it blocks this one. When the capsule and thread lines outgrow a screen, cut detail before you cut threads. Edit the brief directly for clarity and brevity, cite chat findings by session or transcript ID and shared-record findings by their source (PR #, ticket ID, chat permalink, error-tracker issue), and sanitize private context before any public output.

**Reply:** the brief, to the contract above.
