# Comment cleanup evals

`straightforward-cleanup` checks direct deletion of narration while retaining
legal notices, API documentation, a formatting directive, and executable code.
`preserve-unresolved-warning` checks that an unverified constraint stays in the
source. Moving it to a report does not satisfy that case.

Run the offline checker tests from the repository root:

```sh
bun test agents/skills/comment-purge/evals/workflow.test.cjs
```

Without Bun, use Node and Ruby/Psych:

```sh
EVAL_YAML_PARSER=ruby node --test agents/skills/comment-purge/evals/workflow.test.cjs
```

The tests execute the actual YAML graders against correct outputs and protected
deletions or code changes. Live evals also need trace review: clear cleanup
should run directly, and preserving the unresolved warning needs no delegation.
Do not infer a reviewer job from wording in the final report.

## September 16, 2026 comparison

Compared the skill at `c903bb4` with the revised workflow using OpenCode 1.18.31,
Coder Eval 0.12.1, and `openai/gpt-6-astra`. Two cases ran twice per version.
The selected target and shared code-standards skill were the only repository
skills loaded into the candidate catalog. Fixtures and graders were identical.

All eight outcome attempts passed. The baseline launched one reviewer job in
each attempt; the revision launched none. Legal notices, directives, code, and
the unresolved warning remained intact in the revised outputs.

Mean observed durations were 88.7 to 38.3 seconds for straightforward cleanup,
and 107.3 to 56.3 seconds for the warning case. Two attempts do not establish
general speed or cost savings. Parent token counts omit complete nested-agent
attribution, so they are not a complete comparison of cost.

Local evidence is in the separate pilot's ignored run
`workflow-comment-purge-7ai450mi`; the selected trace checks and final outcome
checks are recorded in `workflow-validation.json`. The case definitions and
fixtures here can also run through the existing eval harness.
