#!/usr/bin/env python3
"""Test the documented shell gate without running pnpm or experiments."""

import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path


SKILL = Path(__file__).resolve().parents[1]


class DocumentedExamplesTests(unittest.TestCase):
    def test_check_gate_preserves_status_on_repeated_runs(self):
        setup = (SKILL / "references/setup.md").read_text()
        section = setup.split("## `autoresearch.checks.sh`\n", 1)[1]
        examples = re.findall(r"^```bash\n(.*?)^```$", section, re.M | re.S)
        self.assertEqual(len(examples), 1)

        with tempfile.TemporaryDirectory(prefix="autoresearch-checks-") as directory:
            path = Path(directory)
            gate = path / "autoresearch.checks.sh"
            gate.write_text(examples[0])
            pnpm = path / "pnpm"
            pnpm.write_text(
                "#!/bin/bash\n"
                "set -euo pipefail\n"
                "printf '%s\\n' \"$*\" >> \"$CALL_LOG\"\n"
                "case \"$1\" in\n"
                "  test) status=$TEST_STATUS ;;\n"
                "  typecheck) status=$TYPECHECK_STATUS ;;\n"
                "  *) exit 99 ;;\n"
                "esac\n"
                "printf '%s\\n' \"$DIAGNOSTIC\" >&2\n"
                "exit \"$status\"\n"
            )
            pnpm.chmod(0o755)
            calls = path / "calls.log"
            env = {**os.environ, "PATH": f"{path}:{os.defpath}", "CALL_LOG": str(calls)}
            cases = [
                ("pass", 0, 0, "", 0, ["test --run --reporter=dot", "typecheck"]),
                ("test failure", 7, 0, "tests did not pass", 7, ["test --run --reporter=dot"]),
                ("typecheck failure", 0, 23, "TS2322: incompatible types", 23,
                 ["test --run --reporter=dot", "typecheck"]),
                ("silent typecheck failure", 0, 24, "", 24,
                 ["test --run --reporter=dot", "typecheck"]),
                ("recovery", 0, 0, "", 0, ["test --run --reporter=dot", "typecheck"]),
            ]
            for iteration in range(2):
                for name, test_status, typecheck_status, diagnostic, status, expected_calls in cases:
                    with self.subTest(iteration=iteration, case=name):
                        calls.write_text("")
                        result = subprocess.run(
                            ["bash", str(gate)],
                            cwd=path,
                            env={
                                **env,
                                "TEST_STATUS": str(test_status),
                                "TYPECHECK_STATUS": str(typecheck_status),
                                "DIAGNOSTIC": diagnostic,
                            },
                            capture_output=True,
                            text=True,
                            timeout=10,
                        )
                        self.assertEqual(result.returncode, status, result.stderr)
                        self.assertEqual(calls.read_text().splitlines(), expected_calls)
                        self.assertIn(diagnostic, result.stdout + result.stderr)

    def test_reference_links(self):
        documents = [SKILL / "SKILL.md", *sorted((SKILL / "references").glob("*.md"))]
        linked = set()
        for document in documents:
            for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", document.read_text()):
                with self.subTest(document=document.name, target=target):
                    resolved = (document.parent / target).resolve()
                    self.assertTrue(resolved.is_relative_to(SKILL))
                    self.assertTrue(resolved.is_file(), str(resolved))
                    linked.add(resolved)
        self.assertTrue(set(documents[1:]).issubset(linked))

    def test_shell_example_syntax(self):
        count = 0
        for document in sorted((SKILL / "references").glob("*.md")):
            examples = re.findall(r"^```bash\n(.*?)^```$", document.read_text(), re.M | re.S)
            for index, example in enumerate(examples):
                with self.subTest(document=document.name, example=index):
                    result = subprocess.run(
                        ["bash", "-n"], input=example, text=True, capture_output=True, timeout=10
                    )
                    self.assertEqual(result.returncode, 0, result.stderr)
                    count += 1
        self.assertEqual(count, 8)


if __name__ == "__main__":
    unittest.main(verbosity=2)
