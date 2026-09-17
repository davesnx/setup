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

## Diagnose underperformance

Use account analytics and the actual post before proposing a cause. Separate:

- **Distribution**: impressions and follower versus non-follower reach.
- **Attention**: dwell, media opens, link clicks, or expansion where available.
- **Positive actions**: favorites, replies, reposts, quotes, shares, bookmarks, and follows.
- **Negative actions**: not interested, mute, block, report, or fast abandonment where available.
- **Audience fit**: whether the post matches the interests of people who normally engage with the account.

State what the data supports and what remains unknown. Do not reverse-engineer model weights from one post.

## Source

X For You Feed Algorithm, `xai-org/x-algorithm`, read August 19, 2026. The repository is Apache-2.0 licensed.
