# Upstream source

- Repository: https://github.com/anthropics/skills
- Skill: skill-creator
- Revision: not recorded
- License: Apache-2.0 (`LICENSE.txt` present)

Local changes (2026-09-03): `python` invocations in `SKILL.md` changed to
`python3`; the eval-viewer file-opening step now calls out the platform opener
(`open` on macOS, `xdg-open` on Linux) instead of assuming `open`;
`scripts/quick_validate.py` was rewritten to validate frontmatter without an
external `yaml` dependency; a small dead-code cleanup in
`eval-viewer/viewer.html`; and a pointer in the Writing Style section to the
`writing-for-agents` skill for description and body shaping.
