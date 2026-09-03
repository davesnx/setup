---
name: how
description: Explain or research how something works in this codebase by exploring code and producing a clear architectural explanation. Use for "how does X work", "research X", "trace X", or "where is X used" when X refers to the current codebase. Optionally critique the architecture for issues.
---

# How

Explore the codebase to answer "how does X work?" questions. Produce clear architectural explanations at the level of a senior engineer onboarding onto a subsystem — enough to build a working mental model, not so much that it reads like annotated source code.

Two modes:

1. **Explain** (default) — explore the codebase and produce a clear explanation
2. **Critique** — explain first, then spawn multiple models to independently identify architectural issues

## Explain Mode

### Step 1 — Understand the Question and Assess Complexity

Parse what the user is asking about. They might say:

- "How does message virtualization work?" — a subsystem
- "How do we handle billing for on-demand usage?" — a feature flow
- "How is the auth service structured?" — an architectural overview
- "Walk me through what happens when a user sends a message" — a runtime trace

Identify the scope. If it's ambiguous, make your best guess and state your interpretation before exploring. Don't ask — explore and let the user redirect if you're off.

**Assess complexity to decide the approach:**

- **Simple** (a single module, a small utility, a narrow question like "how does function X work"): Skip explorer agents entirely. The explainer agent explores and explains in a single pass. Go directly to Step 2b.
- **Complex** (a subsystem spanning multiple files/services, a cross-cutting feature, a full architectural overview): Spawn parallel explorer agents first, then hand off to the explainer. Go to Step 2a.

When in doubt, lean toward the simple path — you can always spawn explorers if the explainer hits a wall.

### Step 2a — Explore (complex questions only)

Decompose the question into 2-4 parallel exploration angles. Each angle should cover a distinct slice of the subsystem so the explorers aren't duplicating work. For example, if the question is "how does message virtualization work?", you might split into:

- Explorer 1: the data model and state management
- Explorer 2: the rendering pipeline and DOM interaction
- Explorer 3: the scroll/measurement infrastructure

The right decomposition depends on the question — use your judgment. For narrow questions, 2 explorers is fine. For broad subsystems, use up to 4.

Spawn all explorers in a single message, using the harness's read-only exploration subagent type (`Explore` in Claude Code, `explore` in OpenCode). Do not pass a model; explorers inherit the session model.

Each explorer gets the same base prompt from `references/explorer-prompt.md`, plus a specific exploration angle telling it which slice to focus on. Each explorer should:
- Start broad: Glob for relevant directories, Grep for key types/interfaces/class names
- Follow the thread: once you find an entry point, trace the call chain — callers, callees, data flow, type definitions
- Read the actual code, don't guess from file names
- Stop when you can describe the full path from input to output (or from trigger to effect) without hand-waving any step
- Note things that are surprising, non-obvious, or that a newcomer would get wrong

Each explorer returns structured findings: the components it found, the flow it traced, the files it read, and anything non-obvious. Overlap between explorers is fine — the explainer will reconcile.

Then proceed to Step 3.

### Step 2b — Direct Explain (simple questions)

Explore and explain yourself in one pass; no subagent is needed. Do the exploration (Glob, Grep, Read) and write the explanation directly. Read `references/explainer-prompt.md` for the communication style and output format — follow the same structure, you just don't have explorer findings as input.

Proceed to Step 4.

### Step 3 — Synthesize (complex questions only)

Once all explorers have returned, synthesize their findings yourself into one coherent explanation. Do not hand synthesis to another subagent; it would lose the conversation context and the user's actual question. Use `references/explainer-prompt.md` as your own template (see output format below). Reconcile overlapping findings, resolve contradictions, and weave the separate slices into a unified picture.

### Step 4 — Present

Present the explanation to the user, adding context from the conversation where it helps. The explanation is the product; keep it self-contained.

### Output Format

The explanation should follow this structure, but adapt it to what makes sense for the question. Not every section is needed for every question.

**Overview** — 1-2 paragraphs. What is this thing, what does it do, why does it exist. Someone should be able to read this and decide whether they need to keep reading.

**Key Concepts** — The important types, services, or abstractions. Brief definition of each, not exhaustive — just the ones needed to understand the rest.

**How It Works** — The core of the explanation. Walk through the flow: what triggers it, what happens step by step, where does data go, what are the decision points. Use prose, not pseudocode. Reference specific files and functions so the reader can go look, but don't dump code blocks unless a specific snippet is genuinely necessary to understand the point.

**Where Things Live** — A brief map of the relevant files/directories. Not every file — just the ones someone would need to find to start working in this area.

**Gotchas** — Things that are non-obvious, surprising, or that would trip someone up. Historical context that explains why something looks weird. Known sharp edges.

## Critique Mode

Triggered when the user asks for architectural issues, problems, or improvements — not just understanding.

### Step 1 — Explain First

Run the full explain flow above (Steps 1-4). You need to understand the architecture before you can critique it.

### Step 2 — Spawn Critics

After the explanation is complete, spawn architectural critics. Launch all in a single message:

| Subagent | Lens |
|----------|------|
| Critic A | correctness: invariants, failure modes, data races, error paths |
| Critic B | maintainability: coupling, change cost, testability |
| Critic C | contrarian: argue the current design is right, then find what would actually break it |

Use the harness's general-purpose subagent type and tell each critic not to edit files. Do not pass a model; diversity comes from the lens and independent context, not from model families. Give each critic a different lens so the findings do not collapse into one voice.

Read `references/critic-prompt.md` for the prompt template. Each critic gets:
1. The explanation from Step 1 (so they don't waste time re-exploring)
2. The relevant file paths (so they can read the actual code)
3. The architectural critique rubric from `references/critique-rubric.md`

### Step 3 — Lead Judgment

You're a pragmatic lead, not an aggregator.

Categorize findings:
- **Act on** — Architectural problems worth fixing now
- **Consider** — Real concerns, but the cost/benefit is unclear
- **Noted** — Valid observations, low priority
- **Dismissed** — Wrong, missing context, or style preference

Present the explanation first (from Step 1), then the critique verdict below it. The explanation should stand on its own — someone who just wants to understand the system shouldn't have to wade through critique.
