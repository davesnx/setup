# Inspiration

`auto-improve` is original local writing inspired by the concepts in
[`principle-encode-lessons-in-structure`](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-encode-lessons-in-structure/SKILL.md).

- Reference revision: `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`.
- Reference reviewed: 2026-09-07.
- License reviewed: [`pstack/LICENSE`](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/LICENSE), MIT, Copyright (c) 2026 Lauren Tan.

## Retained Concepts

- Use repeated corrections and failures to identify rules that need enforcement.
- Prefer structural prevention over more written reminders.
- Choose the strongest suitable mechanism; reserve guidance for judgment.
- Resolve the recurring cause rather than only the latest instance.

## Local Differences

- Model-invoked as well as explicitly requested; the source sets
  `disable-model-invocation: true` for manual-only use on supporting hosts.
- Periodic, read-only reviews propose improvements to skills, hooks, scripts,
  and agent rules. The default checkpoint is three completed substantial tasks;
  a host hook, plugin, or scheduler is needed for reliable scheduling.
- Repeated failures, lasting user corrections, and verified reusable workflows
  provide evidence. Existing guidance and enforcement are reused.
- Every proposal waits for user approval before edits. Pending or declined
  proposals are not repeated without a reason to revisit them.
- Verification covers failure and valid cases, actual entry points, retries,
  and prevention of duplicate prompts and recursive review loops.

No substantial source wording is copied or adapted. This record credits
the conceptual inspiration; it does not assign upstream authorship or an
upstream license to the local text.
