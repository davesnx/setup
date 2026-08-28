---
name: x-writing
description: Write, edit, or analyze posts and threads for X, including audience fit, supplied analytics, and verified recommendation-system constraints. Use when the requested output or diagnosis concerns X content. Treat algorithm details as constraints and never promise reach. Do not use for developer documentation, which belongs to technical-docs, or for independent evidence gathering and cited technical findings, which belong to technical-research.
metadata:
  algorithm-source: "https://github.com/xai-org/x-algorithm"
---

# X writing

Write useful X posts for a specific audience. Do not claim that a phrase, format, posting time, or action count guarantees distribution.

## Draft or edit a post

1. State one core message.
2. Name the audience that has a reason to care.
3. Give concrete value through a fact, result, method, example, supported opinion, or useful question.
4. Make the post understandable without hidden context.
5. Remove filler, vague hype, harassment, manipulation, and engagement bait.
6. Keep technical terms exact, but remove jargon used only to signal status.
7. Return the requested post or thread without a reach promise.

For a thread, give each post one job. Make the first post state why the rest is worth reading. Do not stretch one post into a thread to create more impressions.

## Analyze performance

Read [references/x-posts.md](references/x-posts.md) when the user asks about recommendation behavior, reach, ranking, or underperformance.

Use the actual post and supplied account analytics before you propose a cause. Separate distribution, attention, positive actions, negative actions, and audience fit. State what the data supports and what remains unknown. Do not infer model weights from one post.

If the needed analytics or evidence are missing, ask for them or state the limit. Do not start independent technical research unless the user asks for a separate research artifact.

## Output

Follow the user's requested format. If no format is given, provide:

- The core message and audience.
- The main clarity or audience-fit issue.
- The revised post or thread.
- A short rationale based on the supplied material or verified system constraints.
- Unknowns and the next useful measurement when analyzing performance.

## Final review

1. Does the post give this audience a specific reason to care?
2. Can the post stand alone without hidden context?
3. Are factual claims supported by the supplied material?
4. Did the edit remove engagement bait and unsupported growth advice?
5. Does the output avoid promises about reach, virality, or recommendation-system effects?

## Provenance

See [UPSTREAM.md](UPSTREAM.md) for the source and update record.
