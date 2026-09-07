---
name: skill-vendor
description: Keep the skills this repository publishes for other people, such as the mlx skills in ocaml-mlx/skills, in step with their upstream repository through the skill-vendor command. Use when the user says "vendor skills", "skill-vendor", "pull the mlx skills", "push the mlx skills upstream", or asks whether agents/skills/VENDOR is in sync. Not for moving skills between the Mac and nspawn; that is sync-skills.
compatibility: Requires Git, SSH access to the upstream repository, and the setup checkout's terminal/bin/skill-vendor on PATH.
---

# Skill vendor

`agents/skills/VENDOR` lists each upstream repository, its branch, the
directory that holds the skills there, the pinned commit, and the skills copied
from it. The copies under `agents/skills/` are the working copies.
`skill-vendor` moves changes in either direction, only when asked.

## Steps

1. Run `skill-vendor check` and read every line. Each skill is `up to date`,
   `upstream ahead`, `local ahead`, `new local`, `new upstream`, `diverged`, or
   `pending`. Exit 1 means at least one skill needs a pull or push.
2. Pick the direction from those states and the user's request:
   - Upstream moved and the user wants it: `skill-vendor pull`. It replaces the
     local copies and records the new commit in `VENDOR`.
   - Local edits go upstream: `skill-vendor push -m "<message>"` commits on the
     upstream branch. For a pull request, add `--branch <name>`; the pin stays
     unchanged until that branch merges.
   - `diverged`: stop and report. Both sides changed, and the user merges by
     hand.
3. Run `skill-vendor check` again. Every listed skill reads `up to date`, or
   `local ahead` for a branch push that is still open.
4. Commit `agents/skills/VENDOR` together with the skill copies it describes,
   only when the user asks for a commit.

## Rules

- `pull` refuses while a skill is `local ahead`, `new local`, or `diverged`.
  `pull --force` discards those local edits; use it only when the user says so.
- `push` refuses while upstream is ahead. Pull first.
- A new skill also needs whatever the upstream repository asks for, such as a
  README row or a plugin manifest entry. Push it on a branch and finish those by
  hand in the pull request.
- Clones live under `~/.cache/skill-vendor`. A failed clone or fetch means the
  machine lacks SSH access to the upstream. Report it; do not switch remotes.

Command details live in
[`terminal/bin/README.md`](../../../terminal/bin/README.md#vendor-published-skills).
After changing the command, run `bash agents/skills/skill-vendor/tests/skill-vendor.sh`.
