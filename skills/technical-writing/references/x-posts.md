# X posts

Write useful posts for a specific audience. The recommendation system is viewer-specific, so no phrase, question, posting time, or action count guarantees reach.

## Verified system constraints

The current open X algorithm source describes this flow:

- **Thunder** retrieves recent in-network posts from accounts the viewer follows.
- **Phoenix retrieval** and **SimClusters** retrieve out-of-network candidates.
- **Phoenix ranking** predicts the probability that this viewer takes each action on each candidate, plus continuous values such as dwell time.
- Ranking combines weighted predicted probabilities. Weights do not multiply raw engagement counts. Do not claim that one report cancels a fixed number of likes.
- The scorer applies adjustments that include repeated-author decay, an out-of-network discount, and a new-author boost.
- **VMRanker** reranks for diversity.
- Visibility filtering separately decides whether a post is allowed, shown behind an interstitial, or dropped.

Treat these as architecture facts, not a formula for writing.

## Draft or rewrite

1. State one core message.
2. Name the specific audience that has a reason to care.
3. Give the reader concrete value: a fact, result, method, example, opinion with evidence, or useful question.
4. Use terms the audience recognizes, but do not perform insider jargon for its own sake.
5. Make the post understandable without requiring hidden context.
6. Remove misleading claims, harassment, manipulation, and engagement bait that can produce blocks, mutes, reports, or "not interested" actions.
7. Apply the technical-writing sentence rules and final editing checklist.
8. Offer the final post and a short rationale. Do not promise reach.

For a thread, give each post one job and make the first post state the value of continuing. Do not stretch one post into a thread only to create more impressions.

## Diagnose underperformance

Use account analytics and the actual post before proposing a cause. Separate:

- **Distribution**: impressions and follower versus non-follower reach.
- **Attention**: dwell, media opens, link clicks, or expansion where available.
- **Positive actions**: favorites, replies, reposts, quotes, shares, bookmarks, and follows.
- **Negative actions**: not interested, mute, block, report, or fast abandonment where available.
- **Audience fit**: whether the post matches the interests of people who normally engage with the account.

State what the data supports and what remains unknown. Do not reverse-engineer model weights from one post.

## Output

- Core message and audience
- Main clarity or audience-fit issue
- Rewritten post or thread
- Factual rationale tied to the source architecture or supplied analytics
- Unknowns and the next useful measurement

## Source

X For You Feed Algorithm, `xai-org/x-algorithm`, read August 19, 2026. The repository is Apache-2.0 licensed.
