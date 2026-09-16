# Skill mechanics

Read this branch of [writing-for-agents](SKILL.md) when writing skill metadata
or choosing invocation and router behavior. Check the actual host before relying
on any frontmatter control.

## Metadata

Keep `name` stable and `description` short. State the task that selects the skill
and necessary exclusions, not broad topic keywords. A description supports
discovery; it does not grant permissions or guarantee loading. Keep exact output
requirements in the body or a clearly linked reference.

## Invocation

### Hosts that support manual-only skills

On hosts such as Claude Code that honor `disable-model-invocation: true`, this
field prevents automatic model invocation. The description remains in the file
for human-facing use but is not offered for automatic discovery. The user can
invoke the skill through the host's manual mechanism, subject to other controls.

Omit that field when automatic discovery is needed. Write the description for
the agent with precise task triggers. Manual availability is a separate host
setting; for example, Claude Code's `user-invocable: false` hides a skill from
the slash-command menu. Do not claim that model invocation always includes
manual invocation on every host.

### OpenCode

OpenCode ignores `disable-model-invocation`. Its `permission.skill` settings,
globally or per agent, control the skill tool:

- `ask` keeps the skill visible and requires approval to load it.
- `deny` hides the skill and blocks loading through the skill tool.

Neither is an exact manual-only mode. Neither prevents direct file reads.
Keep model-facing trigger boundaries in the description even if another host
treats the skill as manual-only. Do not promise zero discovery context or
human-only reach from a frontmatter field that OpenCode ignores. Use separate
tool and filesystem permissions where access itself must be restricted.

## Splitting by invocation

Create a separate skill when a distinct task needs independent discovery or
manual use. Shared vocabulary alone is not enough. Keep separate skills when
their task boundaries differ, even if they use the same reference.

Shared reference can live in a plain file with conditional links from either
skill. Automatic invocation restrictions are not file-access restrictions;
choose links or skill loading according to the host and permissions.

## Router skills

A router gives one entry point with named branches and a condition for each.
For detail within one skill, link to reference files and load only the selected
branch. For separate skills, say whether to load the skill or ask the user to
invoke it; check host permissions first.

On a host that enforces manual-only invocation, a router can direct the user to
a manual-only skill but cannot invoke it automatically. In OpenCode, that
frontmatter flag does not impose this restriction; skill-tool permissions still
apply. Do not use a router or direct read to bypass an approval or access rule.
