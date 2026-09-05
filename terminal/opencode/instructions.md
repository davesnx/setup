Use OpenCode's Task tool with `subagent_type: "general"` for independent work
or `"explore"` for read-only code exploration. Model selection belongs in
`opencode.jsonc`, not in skill prose or task prompts. The Task tool has no
per-call model parameter; a shared skill's model suggestions do not override
the configured agent.

When an explicit review or comparison needs several agents, give them separate
questions and launch independent work in parallel. Report the models actually
used. Several runs of the same model provide independent attempts, not model
diversity.
