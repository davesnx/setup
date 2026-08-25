# pstack model configuration

No per-role model overrides. Every pstack role uses OpenCode's configured
default model.

When a pstack skill (interrogate, how, reflect, architect, why, or any other)
names a specific model, a model list, or a "configured X model" for a subagent,
ignore the model choice: OpenCode's Task tool has no model parameter. Spawn the
subagent with `subagent_type: "general"` (or `"explore"` for read-only codebase
exploration) and let it inherit the session's model.

Panel semantics still apply: a role that lists N models means N parallel
subagents, all launched in a single message. The diversity comes from
independent runs with independent context rather than from model families. Do
not report the missing model selection as an error or substitution; this is the
configured behavior.
