import tempfile
import unittest
from pathlib import Path

from scripts.quick_validate import validate_skill


class QuickValidateTests(unittest.TestCase):
    def write_skill(self, content):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        skill_dir = Path(temporary.name) / "sample-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(content)
        return skill_dir

    def test_accepts_repository_frontmatter_without_pyyaml(self):
        skill_dir = self.write_skill(
            """---
name: sample-skill
description: Use when testing the validator.
disable-model-invocation: true
user-invocable: true
metadata:
  owner: local
---

# Sample
"""
        )

        self.assertEqual(validate_skill(skill_dir), (True, "Skill is valid!"))

    def test_rejects_unknown_top_level_property(self):
        skill_dir = self.write_skill(
            """---
name: sample-skill
description: Use when testing the validator.
unknown: true
---
"""
        )

        valid, message = validate_skill(skill_dir)
        self.assertFalse(valid)
        self.assertIn("Unexpected key", message)


if __name__ == "__main__":
    unittest.main()
