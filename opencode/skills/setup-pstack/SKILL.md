---
name: setup-pstack
description: Configure which models pstack skills use per role in opencode. Detects available models via `opencode models`, writes an always-applied instructions file with the role-to-model mapping, and defines per-model subagents so panel skills (arena, interrogate, how, reflect, architect) can spawn one Task per model. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack (opencode)

Write `~/.config/opencode/pstack-models.md`, an always-applied instructions file that sets pstack's model per role, and define one opencode subagent per distinct model so skills can actually spawn them. The pstack skills read the mapping and fall back to their inline defaults when a line is absent, so this is an override layer, not a requirement.

opencode differs from Cursor in two ways this skill must bridge:

- There is no `alwaysApply` rule file. The equivalent is a markdown file registered in the `instructions` array of `~/.config/opencode/opencode.json`.
- The Task tool has no `model` parameter. Model choice lives on agent definitions, so each distinct model gets a `pstack-<short-name>` subagent, and skills select models by passing that agent name as `subagent_type`.

## Steps

### 1. Detect available models

Run `opencode models`. It prints one `provider/model-id` slug per line; that is the dependable source. If the command fails or prints nothing, ask the user to paste the slugs they have access to. Never write a slug you have not confirmed is available.

### 2. Load current state

If `~/.config/opencode/pstack-models.md` already exists, read it and treat its values as the current choices. Otherwise start from the pstack defaults, translating each default's intent to the detected set (the upstream defaults name Cursor-only slugs, so map by family and tier):

- `feature, refactoring`, `how explorer`, `why investigators`, `reflect tooling`: a fast frontier model.
- `bug-fix`, `perf-issue`, `hillclimb`: the strongest fast GPT-class model, else the best available equivalent.
- `judgment and prose`, `how explainer`, `why synthesizer`, `reflect judgment, divergent, synthesizer`: the strongest available Claude reasoning model.
- `hardest tasks`: the single most capable model available, regardless of speed.
- Panel roles (`how critics`, `arena runners`, `arena cross-judge pool`, `architect runners`, `interrogate reviewers`): a list of 2-4 models from different families. One subagent runs per model, so the list length sets the count. Arena selects one cross-judge from its pool whose family differs from the parent's when possible.

### 3. Map and confirm

Show every role with its current model, marking any whose model is not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models as the options. Prefer the question tool over free text.

Always include a "no per-role mapping" option: use opencode's configured default model for every role. If chosen, skip step 4, write the no-overrides variant in step 5, and define no `pstack-*` agents in step 6 (remove any that exist).

### 4. Validate

Every slug written must be in the detected set. If a chosen slug is not available, stop and ask again. A mapping pointing at a model the user cannot use breaks every delegation that reads it.

### 5. Write the instructions file

Overwrite `~/.config/opencode/pstack-models.md` entirely so re-runs stay idempotent. Shape:

```markdown
# pstack model configuration

One line per role. Delete a line to fall back to the skill default.

feature, refactoring: <provider/model-id>
bug-fix: <provider/model-id>
perf-issue: <provider/model-id>
hillclimb: <provider/model-id>
judgment and prose: <provider/model-id>
hardest tasks: <provider/model-id>
how explorer: <provider/model-id>
how explainer: <provider/model-id>
how critics: <provider/model-id>, <provider/model-id>, <provider/model-id>
why investigators: <provider/model-id>
why synthesizer: <provider/model-id>
reflect tooling: <provider/model-id>
reflect judgment, divergent, synthesizer: <provider/model-id>
arena runners: <provider/model-id>, <provider/model-id>, <provider/model-id>
arena cross-judge pool: <provider/model-id>, <provider/model-id>, <provider/model-id>
architect runners: <provider/model-id>, <provider/model-id>, <provider/model-id>
interrogate reviewers: <provider/model-id>, <provider/model-id>, <provider/model-id>

## Spawning subagents on a specific model

opencode's Task tool has no model parameter. When a pstack skill says to spawn
a subagent on a given model, pass the matching agent name as `subagent_type`:

| Model | subagent_type |
|-------|---------------|
| <provider/model-id> | pstack-<short-name> |

For panel roles, launch one Task per model in the role's list, all in a single
message. If no pstack-* agent exists for a required model, use `general` and
note the substitution in your output.
```

Fill the table with one row per distinct model used anywhere in the mapping.

**No-overrides variant:** if the user chose opencode's default model for everything, write the file with no role lines. State that every role uses opencode's configured default model, that model names in pstack skills must be ignored (spawn `subagent_type: "general"`, or `"explore"` for read-only exploration, and let subagents inherit the session model), that panel roles still mean N parallel subagents launched in one message with diversity coming from independent runs rather than model families, and that this must not be reported as an error or substitution.

### 6. Define the subagents and register the instructions file

Update `~/.config/opencode/opencode.json` (create it with `"$schema": "https://opencode.ai/config.json"` if missing). Preserve all existing fields.

1. Ensure `instructions` contains `"pstack-models.md"` (paths are relative to the declaring config).
2. Under `agent`, write one entry per distinct model, keyed `pstack-<short-name>` (e.g. `pstack-opus`, `pstack-gpt`, `pstack-grok`). Derive short names from the model family; disambiguate with the tier when two models share a family. Remove `pstack-*` entries for models no longer referenced. Shape:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["pstack-models.md"],
  "agent": {
    "pstack-opus": {
      "mode": "subagent",
      "model": "anthropic/claude-opus-4-8",
      "description": "pstack delegate pinned to anthropic/claude-opus-4-8. Spawn via Task when a pstack skill assigns work to this model."
    }
  }
}
```

Do not set `permission` restrictions on these agents; pstack reviewers need read, bash, and MCP access, and prompts already forbid writes where required.

### 7. Confirm

Tell the user the mapping and agents were written, and that opencode loads config at startup, so they must quit and restart opencode (or start a fresh session) for the changes to apply. Re-running this skill updates everything idempotently.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill or an existing harness). If not, and the `create-verification-skill` skill is installed, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work?" If it is not installed, offer to fetch it from `cursor/plugins` (`pstack/skills/create-verification-skill`) into `~/.agents/skills/` first. On no, move on without pushing.
