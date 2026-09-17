# Upstream reference

## Kent C. Dodds

- Author: Kent C. Dodds.
- Source: https://github.com/kentcdodds/kody/blob/main/.agents/skills/orchestrate/SKILL.md
- Reviewed revision: `5e30cb0260004f63624643344995f95328686e53`.
- License: Functional Source License 1.1, ALv2 Future License (`FSL-1.1-ALv2`).
- Terms: https://github.com/kentcdodds/kody/blob/5e30cb0260004f63624643344995f95328686e53/LICENSE
- Upstream notice: Copyright 2026 Kent C. Dodds.

This local skill uses original wording based on the upstream coordination ideas:
one environment, selective parallel work, limited review, and parent verification.
It is a local adaptation, not a verbatim copy or an upstream-maintained version.

The adaptation uses host-neutral instructions and only available model choices.
It adds local permission and isolated-worktree rules, precise file ownership,
child briefs, partial-work recovery, and direct evidence for completion. It also
defines boundaries with council and implement and grants no publishing
authority. The upstream license link and notice are retained for attribution.

## Cursor playbooks

- Source repository: https://github.com/cursor/plugins
- Reviewed revision: `e31650eea443aaea1e84cc15d88c13f40080b275`.
- Sources at that revision:
  - [autopilot-full.md](https://github.com/cursor/plugins/blob/e31650eea443aaea1e84cc15d88c13f40080b275/pstack/skills/poteto-mode/playbooks/autopilot-full.md)
  - [autopilot-stack.md](https://github.com/cursor/plugins/blob/e31650eea443aaea1e84cc15d88c13f40080b275/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)
  - [babysit.md](https://github.com/cursor/plugins/blob/e31650eea443aaea1e84cc15d88c13f40080b275/pstack/skills/poteto-mode/playbooks/babysit.md)

Ideas adapted in original words: explicit owner and work state, concrete progress
evidence, stop propagation, verification tied to the delivered state, and optional
PR follow-through ordered by conflicts, review issues, then CI. This is not
wholesale vendoring of these playbooks.

The local version keeps one host-neutral environment, an existing task tracker,
parent-only Git writes and review replies, and selective independent review.
It confirms termination before replacement and rechecks affected evidence after
base or integration changes, even with an unchanged patch-id. PR follow-through
uses the existing github and loop-on-ci skills and separates readiness from
permission to publish, reply, resolve, retry, or merge. It does not adopt mandatory
swarm review, timed publication, blanket comment removal, automatic goals, fixed
audit timers, or patch-id exemptions.

This skill is not listed in `agents/skills/VENDOR`, which tracks skills published
upstream from this repository.
