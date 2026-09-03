# Upstream source

- Repository: https://github.com/mattpocock/skills
- Source: https://github.com/mattpocock/skills/blob/main/skills/engineering/triage/SKILL.md
- Revision: not recorded (skillFolderHash `b20940845332f540e3f17b0cb32d45fd8c2298bf` in `~/.agents/.skill-lock.json`)
- Vendored: August 6, 2026
- License: MIT (repository LICENSE)

`SKILL.md` was vendored from upstream. Local changes (2026-08-29): the grilling step was repointed from `tdd` in Domain modeling mode to the newly split-out `domain-modeling` skill, when `tdd` and `domain-modeling` were split apart locally.

Local changes (2026-09-03): added an `argument-hint: "[#issue | PR url]"` frontmatter field as part of a portability pass across skills.

Local changes (2026-09-03): the claim-verification step now points to the `verify-this` skill for a baseline-versus-treatment verdict when the claim is testable locally.
