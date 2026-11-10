---
name: grilling
model: claude-fable-5-2
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, says "grill me" or "grill with docs", or uses another grill trigger phrase. Also for "ideate", "refine this idea", or "explore options for an idea".
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

## Modes

- **Standard**: Use the interview workflow below.
- **With docs**: When the user asks to "grill with docs", also load `domain-modeling`. Maintain its glossary during the interview and offer an ADR only when its reversal, surprise, and trade-off conditions are all true. The interview workflow still controls question order and completion.
- **Ideate**: For a raw idea, or "ideate", "refine this idea", "explore options for an idea", read [references/ideate.md](references/ideate.md). It diverges into variants first, then runs the standard interview on the pick.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
**Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

Recommendation: <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

When an answer sounds like what the user should want (best-practice talk, "the standard way", "scalable"), ask: "If you did not have to justify this to anyone, what would you want?"

When an answer uses a vague quality word (faster, simpler, better), ask for the number or observable result that means done.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Close

Restate the result in a few lines: outcome, user, success measure, constraint, and an "Out of scope" line. Ask for an explicit yes. "Whatever you think" and "sounds good" are not a yes: re-ask with two concrete options. Fold corrections in and restate until the yes.

After the yes, write `.workplace/plans/<slug>_BRIEF.md` with the restatement and the decisions, and name `to-spec` as the next skill.
