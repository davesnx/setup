#!/usr/bin/env python3
"""Validate a skill without external Python dependencies."""

import re
import sys
from pathlib import Path


ALLOWED_PROPERTIES = {
    "allowed-tools",
    "argument-hint",
    "compatibility",
    "description",
    "disable-model-invocation",
    "hooks",
    "license",
    "metadata",
    "name",
    "user-invocable",
    "version",
}


def parse_frontmatter(content):
    """Return top-level frontmatter values needed by validation."""
    if not content.startswith("---\n"):
        raise ValueError("No YAML frontmatter found")

    end = content.find("\n---", 4)
    if end == -1:
        raise ValueError("Invalid frontmatter format")

    lines = content[4:end].splitlines()
    keys = []
    values = {}
    index = 0

    while index < len(lines):
        line = lines[index]
        if not line or line[0].isspace() or line.lstrip().startswith("#"):
            index += 1
            continue

        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$", line)
        if not match:
            raise ValueError(f"Invalid top-level frontmatter line: {line}")

        key, value = match.groups()
        if key in values:
            raise ValueError(f"Duplicate frontmatter key: {key}")
        keys.append(key)

        value = (value or "").strip()
        if value in {">", "|", ">-", "|-"}:
            continuation = []
            index += 1
            while index < len(lines) and (not lines[index] or lines[index][0].isspace()):
                continuation.append(lines[index].strip())
                index += 1
            values[key] = " ".join(part for part in continuation if part)
            continue

        values[key] = value.strip('"').strip("'")
        index += 1

    return keys, values


def validate_skill(skill_path):
    """Validate the skill directory and its SKILL.md frontmatter."""
    skill_path = Path(skill_path)
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    try:
        keys, frontmatter = parse_frontmatter(skill_md.read_text())
    except ValueError as error:
        return False, str(error)

    unexpected_keys = set(keys) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in SKILL.md frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed properties are: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    if "name" not in keys:
        return False, "Missing 'name' in frontmatter"
    if "description" not in keys:
        return False, "Missing 'description' in frontmatter"

    name = frontmatter.get("name", "").strip()
    if not name:
        return False, "Name cannot be empty"
    if not re.match(r"^[a-z0-9-]+$", name):
        return False, f"Name '{name}' should be kebab-case (lowercase letters, digits, and hyphens only)"
    if name.startswith("-") or name.endswith("-") or "--" in name:
        return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"
    if len(name) > 64:
        return False, f"Name is too long ({len(name)} characters). Maximum is 64 characters."
    if name != skill_path.name:
        return False, f"Name '{name}' must match directory name '{skill_path.name}'"

    description = frontmatter.get("description", "").strip()
    if not description:
        return False, "Description cannot be empty"
    if "<" in description or ">" in description:
        return False, "Description cannot contain angle brackets (< or >)"
    if len(description) > 1024:
        return False, f"Description is too long ({len(description)} characters). Maximum is 1024 characters."

    compatibility = frontmatter.get("compatibility", "")
    if compatibility and len(compatibility) > 500:
        return False, f"Compatibility is too long ({len(compatibility)} characters). Maximum is 500 characters."

    return True, "Skill is valid!"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 quick_validate.py <skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)
