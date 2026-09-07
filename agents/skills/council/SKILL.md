---
name: council
description: Run a subagent council to investigate one problem from multiple perspectives and models, compare findings, and produce a recommendation. Use for a council, second opinions, multiple agents or models on one question, red-team/blue-team comparison, or deciding between competing approaches.
---

# Council

Use this skill to coordinate multiple subagents investigating the same question, with deliberately different assigned perspectives (and different models when the harness allows), then synthesize their reports into one recommendation.

This skill is best for judgment-heavy tasks: architecture tradeoffs, risky bug fixes, code review red-teaming, rollout decisions, incident analysis, and “is this alternative worth pursuing?” questions.

## Workflow

### 1. Frame the council question

State the decision the council should answer in one sentence. Identify:

- the competing options or hypothesis under review;
- the codebase, branch, PR, issue, design, or artifact to inspect;
- whether agents should be read-only or may make code changes;
- the final decision criteria, such as correctness, risk, implementation cost, testability, rollout safety, or product behavior.

If the user’s request is ambiguous, ask only the minimum clarification needed. Otherwise choose sensible defaults and proceed.

### 2. Choose council members

Diversity comes from independent context and deliberately different angles. Some harnesses also let you pick a different model per child; when that is available and the user has not asked for one model, spread the members across the strongest available models. When it is not (Claude Code's `Agent` tool offers only Anthropic models; OpenCode's subagents inherit the session model), say so in one sentence and run every member on the session model. Never invent model IDs.

Default roster for a three-member council:

- architect/correctness reviewer: architecture, invariants, edge cases;
- implementation/testability reviewer: feasibility, test strategy, migration and rollout cost;
- contrarian reviewer: hidden assumptions, alternative framing, “argue against the obvious solution”.

Swap in a security, performance, or product-risk angle when the question calls for it. Do not make the angles redundant; never ask every member for general architecture review.

Launch all members in one message so they run in parallel.

For read-only investigations, keep all children in the same checkout and explicitly tell them not to edit files. For implementation or prototyping councils, give each local child its own git worktree and branch so they cannot collide.

### 3. Brief before launching

For explicit orchestration requests, briefly tell the user which council members you plan to launch and what each will investigate, then launch. Wait for approval first only when the council may edit files, or when the user asked to be consulted before launches.

The shared brief should include:

- repository path or artifact location;
- current branch or base context;
- the exact question to answer;
- relevant background and known concerns;
- required files/symbols to inspect, if known;
- constraints, especially read-only/no commits/no PRs;
- expected report format.

Keep launch prompts short enough that task titles stay compact. If a long brief causes launch validation issues, launch with a minimal prompt and send the full brief to the child agents immediately afterward.

### 4. Ask for structured reports

Ask every council member to return:

1. exact file paths, symbols, docs, or evidence inspected;
2. the current behavior or current implementation;
3. the alternative being evaluated;
4. correctness risks and edge cases;
5. implementation and testing cost;
6. recommendation: keep current approach, pursue alternative, or use a hybrid;
7. confidence level and unknowns.

Encourage independence. Do not share one child’s findings with the others unless you are intentionally doing a second-round critique.

### 5. Collect reports

Read completion messages as they arrive. Do not rely on lifecycle success alone; the useful output is in the child’s report.

If a report is missing key evidence or makes an unsupported claim, send a focused follow-up question to that same child rather than launching a replacement. Reuse existing children for follow-ups because they retain context.

### 6. Synthesize the recommendation

Compare the reports by evidence quality, not by vote count. In the final answer:

- lead with the recommendation;
- call out consensus and disagreements;
- explain why the recommended option wins against the decision criteria;
- explicitly address the user’s stated concern;
- include relevant file paths/symbols without overloading the answer;
- distinguish “do now” from optional future hardening;
- mention confidence and material unknowns.

Prefer a concise decision memo over a transcript summary. The user needs the distilled recommendation, not every intermediate detail.

## Final answer template

Use this shape unless the task calls for something different:

```markdown
## Recommendation

[One or two sentences with the decision.]

## Why

- [Key reason 1]
- [Key reason 2]
- [Key reason 3]

## Tradeoffs and risks

- [Risk or caveat]
- [Testing/rollout implication]

## Final call

[Concrete next step: merge current change, pursue alternative, hybrid, run tests, etc.]
```

## Practical notes

- If the council is read-only, tell children not to modify files, commit, create branches, or open PRs.
- If the council involves PR or branch work, follow the repository’s normal version-control rules and use isolated worktrees for parallel local edits.
- If the council is about code review feedback, mark review comments resolved only after the underlying issue is actually addressed.
- Do not expose internal child agent IDs in user-facing summaries unless the user explicitly asks for them.
