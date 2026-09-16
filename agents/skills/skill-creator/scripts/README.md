# Description evaluation runner

These Python entry points use **Claude Code only**. They do not route requests
through OpenCode or use the current host model. Install and authenticate Claude
Code separately before a live run. Run these commands from the skill-creator
directory:

```sh
python3 -B -m scripts.run_eval --eval-set /path/to/queries.json --skill-path /path/to/skill --model sonnet --num-workers 1 --runs-per-query 1 --timeout 60
python3 -B -m scripts.run_loop --eval-set /path/to/queries.json --skill-path /path/to/skill --model sonnet --max-iterations 2 --report none
```

`--model` accepts a `claude-*` ID or the `sonnet`, `opus`, or `haiku` alias.
Provider IDs such as `openai/gpt-6-astra` are rejected before execution.
`run_eval` can omit the model to use Claude CLI configuration. `run_loop` requires
one model for both evaluation and description improvement. Use an explicit
versioned Claude ID when comparing repeated runs. JSON `model` records the
requested value, not a resolved model version. These commands can incur cost.

## What is measured

Each attempt gets a new temporary working directory with one native candidate
skill. Its name has a unique suffix. Its description is the supplied description;
its body only ends the selection test. A session instruction asks Claude to
select a relevant skill or answer `NO_SKILL`, not to perform the user's task.
The user query does not contain the candidate name.

This measures native Skill-tool selection in a candidate-only catalog. It does
not measure full-task behavior, instruction quality, or competition with a real
skill catalog. Do not compare these scores with the earlier full-task runner.
A positive requires both a candidate tool call and Claude's successful load
receipt, not an assistant claim that it selected a skill.

Only `Skill` is offered through `--tools`; a CLI version may also retain
`EndConversation`. No file, shell, search, agent, or MCP tools are permitted.
`--strict-mcp-config` with an empty MCP configuration and an MCP deny rule block
MCP access. A session-only `PreToolUse` hook rejects any skill name other than
the candidate, including installed same-name skills and built-in commands. The
hook returns no allow decision, so it cannot override existing hooks or denials.

Caller project files and settings are not copied. `HOME`, `CLAUDE_CONFIG_DIR`,
authentication, user settings, plugins, and existing hooks are left in place.
No credentials are read, copied, or printed by the evaluator. Normal CLI auth
refresh and configured hooks can still run. This is not an OS sandbox.

## Unsupported catalogs

A score requires an initialization event advertising exactly the candidate in
`skills`, only permitted tools, and no MCP servers. Missing evidence or extra
skills abort the batch as **unsupported**, including an otherwise successful
negative query. The runner never counts an installed skill as the candidate.
It checks the completed transcript, so a rejected run can still incur model
cost. The hook blocks substitution before another skill loads.

The documented controls tested with Claude Code 2.1.270 do not provide a
candidate-only catalog on this host while preserving its plugin hooks:

- `--allowedTools Skill(candidate)` grants permission but does not hide other
  skills. In a live probe, Claude still loaded installed `technical-docs`.
- `skillOverrides` hides ordinary skills, but does not apply to plugin skills.
  A second probe selected the candidate, but six Ponytail skills remained
  advertised. It is not a valid isolated comparison.
- Disabling Ponytail would also disable its hooks. The evaluator does not do it.
- `disableBundledSkills` removes bundled skills, not user or plugin skills. The
  evaluator also hides `doctor`, which that setting leaves typable.
- Excluding user settings with `--setting-sources`, or using `--restricted`,
  can remove user hooks. `--bare` skips hooks and does not read OAuth credentials.
  `--safe-mode` disables skills and hooks. None is used here.
- A different `CLAUDE_CONFIG_DIR` separates settings, plugins, and credential
  storage. The evaluator does not move or copy the current login into one.

Use an independently prepared Claude profile with the required authentication
and hooks and no unrelated advertised skills. Do not disable security hooks to
make a comparison pass. If that profile cannot meet the catalog check, this
runner does not support its description comparison.

Sources: [CLI flags](https://code.claude.com/docs/en/cli-reference),
[skill visibility and plugin limits](https://code.claude.com/docs/en/skills#override-skill-visibility-from-settings),
[skill settings](https://code.claude.com/docs/en/settings-reference#plugins-and-skills),
[settings merging](https://code.claude.com/docs/en/settings#settings-precedence),
and [configuration directory and bare-mode authentication](https://code.claude.com/docs/en/env-vars).

The runner waits for process exit and parses all completed messages, including
messages after selection. A successful result event and exit code zero
are required. Process failure, timeout, malformed or incomplete output, tool
failure, and permission denial abort the batch without scores. They are never
counted as non-triggers. Pending attempts are cancelled; running attempts can
finish up to their timeout. Temporary command contexts are removed after success
or failure. No caller `.claude/commands` or `.claude/skills` files are changed.

The `--holdout` split in `run_loop` is selection validation. Its queries and
scores are withheld from the improvement prompt, but its scores select the best
iteration. It is not an untouched final test. Saved JSON keeps `test_*` and
`best_test_score` keys for existing reports; these refer to validation. The loop
returns a description and does not change `SKILL.md`.

## Local tests

```sh
python3 -B -m unittest discover -s tests -p 'test_*.py' -v
```

The runner tests use fake Claude commands and require no model credentials.
