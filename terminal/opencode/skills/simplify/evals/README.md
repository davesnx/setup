# Simplification verification

`verification-in-report` supplies a project with `npm test`. The test checks
behavior and writes a hash of the verified `sloppy.mjs` to `verification.json`.
The outcome grader requires that hash to match the final source and requires
the summary to name the verification command and its result. The verifier and
package script must remain unchanged.

Run offline checker tests from the repository root:

```sh
bun test terminal/opencode/skills/simplify/evals/workflow.test.cjs
```

Without Bun, use Node and Ruby/Psych:

```sh
EVAL_YAML_PARSER=ruby node --test terminal/opencode/skills/simplify/evals/workflow.test.cjs
```

The tests reject missing or stale verification records, missing report details,
and verifier edits. These artifact checks alone do not prove command execution:
inspect the live trace for a successful `npm test` after the last source edit.
Review the summary for correct meaning rather than trusting keyword matches.

## September 16, 2026 comparison

Compared `c903bb4` with the shortened verification section using OpenCode 1.18.31,
Coder Eval 0.12.1, and `openai/gpt-6-astra`. Both `verification-in-report` and
`safety-outranks-line-count` ran twice per version, with identical fixtures and
graders and shared code-standards available on both sides.

All eight outcome attempts passed. Both revised verification attempts ran
`npm test` after the last source edit and retained the result in the summary.
The safeguard case preserved the existing failure behavior and guards.

Reported parent tokens for the verification case averaged 108,923 before and
69,735 after. Duration did not consistently improve: one revised attempt took
138.6 seconds. The change preserves verified behavior and reporting with shorter
instructions; these few trials do not establish a general latency improvement.

Local evidence is in the separate pilot's ignored run
`workflow-simplify-p4utsr8p`, with selected trace assertions in
`workflow-validation.json`.
