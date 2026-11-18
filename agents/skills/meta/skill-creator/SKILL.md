---
name: skill-creator
description: Create or revise a skill, evaluate its outputs, or tune its trigger description. Not for ordinary tasks that use an existing skill.
---

# Skill Creator

Start at the user's current stage. A clear edit does not need an interview,
benchmark, or description-tuning loop.

## Choose a path

- **Create or edit:** read [Authoring](references/authoring.md). For optional
  writing guidance, load `writing-for-agents` by name through the host's skill
  lookup. If unavailable, continue with Authoring; do not assume a sibling path.
- **Test outputs or compare versions:** read [Evaluation](references/evaluation.md)
  before changing a version needed as a baseline. It covers cases, grading,
  repeated runs, human review, iteration, and optional blind comparison.
- **Tune when the skill loads:** read
  [Description tuning](references/description-tuning.md). Test intended tasks
  and near-misses, not broad keyword overlap.
- **Package or adapt to a host:** read
  [Packaging and hosts](references/packaging-and-hosts.md) for Claude Code,
  Claude.ai, Cowork, OpenCode, and headless operation.

Read only the references needed for the task. Follow their conditional links
to JSON schemas and grader, comparator, or analyzer prompts when needed.

## Shared workflow

1. Read the current skill, relevant references, callers, and existing cases.
   Extract the requested task, trigger boundary, output, and success criteria
   from the conversation. Ask only for missing decisions that affect the work.
2. Keep the existing name and directory unless a rename is requested. Preserve
   requirements, permissions, output contracts, scripts, and relative links.
   Keep separate tasks separate; do not merge skills to reduce file count.
3. Make the smallest coherent edit. Use a short description that names the task
   and necessary exclusions. Do not add broad triggers to compensate for an
   assumed model tendency to miss skills.
4. Verify metadata, links, and every affected branch. For measured comparisons,
   use fresh runs with a recorded baseline and the actual host/model. Report
   missing evidence; never invent timing, token counts, costs, or gains.
5. Report changed files, checks, and limits. Iterate when results or user
   feedback identify a gap. Package, install, or publish only when authorized.

## Safety and completion

Skills and test prompts do not grant permissions. Keep tools and writes within
the user's approved scope. Do not add hidden actions, unauthorized access, or
data transfer. Use disposable test inputs for state-changing tasks.

From this skill's directory, validate each changed skill with an absolute path:

```bash
python3 -B scripts/quick_validate.py /absolute/path/to/skill
```

Validation checks metadata, not behavior. Run the relevant repository checks
and inspect the actual outputs when behavior is tested. If the user requested
only an edit, report static checks without claiming a measured improvement.
