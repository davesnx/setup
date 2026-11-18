# Description tuning

Use this path to test when a skill loads. Keep the description short and specific
to the requested task. Topic overlap alone is not a trigger. Include exclusions
where adjacent skills would otherwise compete.

Trigger behavior depends on the host, model, available skills, and permissions.
Treat claims about missed triggers or the effect of wording as hypotheses to
test, not general facts about Claude or other models. Test short tasks as well
as complex ones when both belong to the skill's intended scope.

## Select the runner

`scripts.run_eval` invokes `claude -p`. `scripts.run_loop` uses that evaluator
and Claude to propose descriptions. They do not route arbitrary provider IDs.
Use a Claude model supported by that CLI for both evaluation and improvement. Do not
copy an Astra or `openai/...` ID from the current session into `--model`.

Check the CLI, authentication, dependencies, permissions, and advertised skill
catalog before interpreting results. Each attempt creates one native candidate
under `.claude/skills/` and tests selection only, not the requested task. Only the
Skill tool is offered; a session hook rejects other skill names without replacing
existing hooks or permission denials. Caller files and settings are not copied.
User authentication, plugins, and hooks remain in place. This is not a security
sandbox. Use trusted queries and approved permissions.

The runner requires a candidate-only advertised catalog. Extra installed or
plugin skills make a comparison unsupported, not a missed trigger or a passing
negative case. The current setup's Claude plugin catalog does not meet this
requirement. Use an independently prepared, authorized profile that retains its
required hooks, or report the comparison as unavailable. Do not disable security
hooks or copy credentials to force a score. See the
[runner limits](../scripts/README.md#unsupported-catalogs).
Record the actual model and tool versions; an alias is not a resolved version.
For OpenCode, use its own [eval-harness](packaging-and-hosts.md#opencode) with a
real model supported by that host. The runners have different case and result
contracts; they are not interchangeable.

## Build the trigger set

Use about 20 realistic queries, split between should-trigger and should-not-trigger:

```json
[
  {"query": "the user's task prompt", "should_trigger": true},
  {"query": "a nearby task outside this skill", "should_trigger": false}
]
```

Cover each intended branch with different phrasings, including requests that
do not name the skill. Use near-misses that share vocabulary but require another
task. Include realistic paths, inputs, and expected outputs where relevant;
avoid irrelevant negative cases and added detail that changes the intent.
Keep queries unique so results can be matched to training/validation sets.

Review ambiguous labels with the user. For an interactive review, use
[the existing template](../assets/eval_review.html):

1. Replace `__EVAL_DATA_PLACEHOLDER__` with the JSON array as a JavaScript value,
   not a quoted JSON string.
2. Replace `__SKILL_NAME_PLACEHOLDER__` and `__SKILL_DESCRIPTION_PLACEHOLDER__`
   with the skill's current values, escaped for their HTML context. Keep inserted
   JSON safe inside a script element; do not insert executable user text.
3. Write a temporary HTML file and open with `open` on macOS or `xdg-open` on
   Linux, when available. Otherwise provide the file or review the set in chat.
4. The user can edit queries and labels, add/remove entries, then select
   Export Eval Set. Locate the actual downloaded `eval_set.json` (possibly with
   a numbered suffix) and save that reviewed set to the workspace.

## Run and inspect

From the skill-creator directory, use `scripts.run_eval` for one description or
the bounded loop for proposed revisions:

```bash
python3 -B -m scripts.run_eval \
  --eval-set <trigger-eval.json> --skill-path <skill-directory> \
  --model <supported-claude-model> --verbose
```

```bash
python3 -B -m scripts.run_loop \
  --eval-set <trigger-eval.json> --skill-path <skill-directory> \
  --model <supported-claude-model> --max-iterations 5 \
  --results-dir <workspace>/description-tuning --verbose
```

Save stdout and stderr through the host's process tools and inspect progress.
The loop defaults to a stratified 60/40 training/selection-validation split and
three runs per query. Validation scores are hidden from the improvement prompt,
but select `best_description`. Saved JSON retains `test_*` and `best_test_score`
field names; they refer to selection validation, not untouched final tests.
The loop returns a description without changing `SKILL.md` and writes an HTML
report. Use `--report none` if browser reporting is unavailable. Check current
`--help` and [runner documentation](../scripts/README.md) for execution details.

Inspect logs for runner failures and timeouts before interpreting scores. A
failed invocation is not evidence that a negative query correctly avoided the
skill. The evaluator requires successful process completion and a valid result;
process, transcript, tool, permission, or timeout errors abort without scores.
It requires a native candidate skill call and successful load receipt for a
positive. The candidate body ends the selection test. Keep full-task quality and
real-catalog competition tests separate; earlier contaminated full-task scores
are not comparable with this measurement.

## Apply a result

Compare the best description with the original. Reject broader or misleading
triggers even if their score is higher. Preserve the task boundary and show the
before/after text with observed training/validation scores and run counts.

Update only after reviewing those results. Selecting a description by validation
score uses that set for selection; use fresh held-out queries before claiming
general improvement. If model runs were not performed, report a wording edit
with static checks, not optimized or measured triggering accuracy.
