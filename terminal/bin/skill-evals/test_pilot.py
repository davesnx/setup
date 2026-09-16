import argparse
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

import pilot
from isolate import configuration, isolated_env, provider_auth, validate_effective_config
from report import activations, routing_counts, summarize


class Checkers(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)

    def check(self, name, passed):
        result = subprocess.run(
            ["node", str(pilot.HERE / "check.mjs"), name],
            cwd=self.work,
            text=True,
            capture_output=True,
            timeout=10,
        )
        self.assertEqual(result.returncode == 0, passed, result.stderr)

    def write(self, name, content):
        (self.work / name).write_text(content)

    def fixture(self, name, file, destination):
        shutil.copyfile(pilot.CATALOG[name] / "evals/fixtures" / file, self.work / destination)

    def test_sql_rejects_wrong_verdict_evidence_location_and_modified_input(self):
        self.fixture("code-review", "sql-injection.diff", "diff.patch")
        good = {
            "action": "block",
            "findings": [
                {
                    "file": "users.py",
                    "line": 10,
                    "severity": "high",
                    "category": "sql-injection",
                    "remediation": "bound-parameters",
                    "evidence": {
                        "source": "query = f\"SELECT id, name FROM users WHERE name = '{name}'\"",
                        "sink": "return connection.execute(query).fetchone()",
                    },
                }
            ],
        }
        self.write("review.json", json.dumps(good))
        self.check("review-sql", True)
        for field, value in [
            ("line", 1),
            ("category", "correctness"),
            ("evidence", {"source": "invented", "sink": "invented"}),
        ]:
            bad = copy.deepcopy(good)
            bad["findings"][0][field] = value
            self.write("review.json", json.dumps(bad))
            self.check("review-sql", False)
        self.write("review.json", '{"action":"approve","findings":[]}')
        self.check("review-sql", False)
        self.write("review.json", json.dumps(good))
        self.write("diff.patch", "")
        self.check("review-sql", False)

    def test_clean_review_rejects_invented_findings_and_missing_output(self):
        self.fixture("code-review", "trivial-rename.diff", "diff.patch")
        self.check("review-clean", False)
        self.write("review.json", '{"action":"approve","findings":[]}')
        self.check("review-clean", True)
        self.write("review.json", '{"action":"approve","findings":[{"issue":"imagined"}]}')
        self.check("review-clean", False)

    def test_behavior_rejects_wrong_order_mutation_state_and_missing_summary(self):
        self.write("sloppy.mjs", "export const firstPositive = xs => xs.find(x => x > 0);\n")
        self.check("simplify-behavior", False)
        self.write("cleanup.md", "Removed the trusted-path scaffolding.")
        self.check("simplify-behavior", True)
        self.check("simplify-shape", True)
        for bad in [
            "export const firstPositive = xs => xs.findLast(x => x > 0);",
            "export const firstPositive = xs => xs.sort((a,b)=>a-b).find(x => x > 0);",
            "let value; export const firstPositive = xs => value ||= xs.find(x => x > 0);",
            "export const firstPositive = xs => xs.find(x => x >= 0);",
        ]:
            self.write("sloppy.mjs", bad)
            self.check("simplify-behavior", False)
        self.fixture("simplify", "sloppy.mjs", "sloppy.mjs")
        self.check("simplify-behavior", True)
        self.check("simplify-shape", False)

    def test_readonly_rejects_edits_and_empty_reviews(self):
        self.fixture("simplify", "bloated.mjs", "bloated.mjs")
        self.write("review.md", "")
        self.check("simplify-readonly", False)
        self.write("review.md", "NameFormatter can be inlined as value.trim().")
        self.check("simplify-readonly", True)
        self.write("bloated.mjs", "export const formatName = value => value.trim();")
        self.check("simplify-readonly", False)


class Evidence(unittest.TestCase):
    def test_commit_deltas_and_routing_are_not_pooled_across_variants(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "audit").mkdir()
            (root / "routing-labels.json").write_text(
                json.dumps(
                    [
                        {"id": "x", "required": ["simplify"], "allowed": ["simplify"]},
                    ]
                )
            )
            manifest = {
                "expected": [
                    {"group": "simplify", "variant": variant, "task": "route-x", "repeats": 1}
                    for variant in ["off", "on"]
                ],
                "baseline_variant": "off",
                "suite": "behavior",
                "catalog": ["simplify"],
                "model": "test/model",
                "opencode": "test",
                "coder_eval": "0.12.1",
            }
            (root / "manifest.json").write_text(json.dumps(manifest))
            for variant in ["off", "on"]:
                passed = variant == "on"
                commands = (
                    [
                        {
                            "tool_name": "Skill",
                            "result_status": "success",
                            "parameters": {"skill": "simplify"},
                        }
                    ]
                    if passed
                    else []
                )
                path = root / f"results/simplify/{variant}/route-x/00/task.json"
                path.parent.mkdir(parents=True)
                path.write_text(
                    json.dumps(
                        {
                            "task_id": "route-x",
                            "variant_id": variant,
                            "final_status": "SUCCESS" if passed else "FAILURE",
                            "max_turns_exhausted": False,
                            "iterations": [{"commands": commands}],
                            "total_token_usage": None,
                            "duration_seconds": 1,
                            "success_criteria_results": [
                                {
                                    "description": "outcome:test",
                                    "evaluation_status": "evaluated",
                                    "score": int(passed),
                                    "pass_threshold": 1,
                                    "error": None,
                                }
                            ],
                        }
                    )
                )
                (root / f"audit/{variant}.json").write_text(
                    json.dumps(
                        {
                            "catalog_verified": True,
                            "configuration_verified": True,
                        }
                    )
                )
            self.assertEqual(summarize(root), 1)
            summary = json.loads((root / "summary.json").read_text())
            self.assertTrue(summary["valid_comparison"])
            self.assertEqual(summary["deltas"][0]["delta_pp"], 100)
            self.assertEqual(summary["deltas"][0]["variant"], "on")
            manifest["suite"] = "routing"
            (root / "manifest.json").write_text(json.dumps(manifest))
            self.assertEqual(summarize(root), 1)
            summary = json.loads((root / "summary.json").read_text())
            self.assertIsNone(summary["routing"])
            self.assertEqual(summary["routing_by_variant"]["off"]["simplify"]["recall"], 0)
            self.assertEqual(summary["routing_by_variant"]["on"]["simplify"]["recall"], 1)

    def test_activation_requires_successful_tool_call_not_quoted_text(self):
        result = {
            "iterations": [
                {
                    "commands": [
                        {
                            "tool_name": "Write",
                            "result_status": "success",
                            "parameters": {"content": '"name":"simplify"', "skill": "simplify"},
                        },
                        {
                            "tool_name": "Skill",
                            "result_status": "error",
                            "parameters": {"skill": "unslop"},
                        },
                        {
                            "tool_name": "Skill",
                            "result_status": "success",
                            "parameters": {"skill": "code-review"},
                        },
                    ]
                }
            ]
        }
        self.assertEqual(activations(result), {"code-review"})

    def test_routing_accounts_for_misses_false_positives_and_optional_support(self):
        labels = {
            "a": {"required": ["review"], "allowed": ["review", "standards"]},
            "b": {"required": [], "allowed": []},
        }
        counts = routing_counts(
            [
                {"task": "a", "activated": ["standards"]},
                {"task": "b", "activated": ["review"]},
            ],
            labels,
            ["review", "standards"],
        )
        self.assertEqual(counts["review"]["fn"], 1)
        self.assertEqual(counts["review"]["fp"], 1)
        self.assertEqual(counts["standards"]["fp"], 0)

    def test_missing_attempts_cannot_produce_a_valid_comparison(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "manifest.json").write_text(
                json.dumps(
                    {
                        "expected": [
                            {"group": "simplify", "variant": "absent", "task": "x", "repeats": 2}
                        ],
                        "suite": "behavior",
                        "catalog": [],
                        "model": "test/model",
                        "opencode": "test",
                        "coder_eval": "0.12.1",
                    }
                )
            )
            (root / "routing-labels.json").write_text("[]")
            self.assertEqual(summarize(root), 2)
            self.assertFalse(json.loads((root / "summary.json").read_text())["valid_comparison"])

    def test_checker_error_invalidates_delta_instead_of_scoring_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "audit").mkdir()
            (root / "routing-labels.json").write_text("[]")
            (root / "manifest.json").write_text(
                json.dumps(
                    {
                        "expected": [
                            {"group": "simplify", "variant": variant, "task": "x", "repeats": 1}
                            for variant in ["current", "absent"]
                        ],
                        "suite": "behavior",
                        "catalog": [],
                        "model": "test/model",
                        "opencode": "test",
                        "coder_eval": "0.12.1",
                    }
                )
            )
            for variant in ["current", "absent"]:
                path = root / f"results/simplify/{variant}/x/00/task.json"
                path.parent.mkdir(parents=True)
                path.write_text(
                    json.dumps(
                        {
                            "task_id": "x",
                            "variant_id": variant,
                            "final_status": "SUCCESS",
                            "max_turns_exhausted": False,
                            "iterations": [],
                            "total_token_usage": None,
                            "duration_seconds": 1,
                            "success_criteria_results": [
                                {
                                    "description": "outcome:test",
                                    "evaluation_status": "evaluated",
                                    "score": 1,
                                    "pass_threshold": 1,
                                    "error": None,
                                }
                            ],
                        }
                    )
                )
                (root / f"audit/{variant}.json").write_text(
                    json.dumps(
                        {
                            "catalog_verified": True,
                            "configuration_verified": True,
                        }
                    )
                )
            self.assertEqual(summarize(root), 0)
            manifest_path = root / "manifest.json"
            manifest = json.loads(manifest_path.read_text())
            manifest["manual_review_tasks"] = ["x"]
            manifest_path.write_text(json.dumps(manifest))
            self.assertEqual(summarize(root), 0)
            assessment = json.loads((root / "summary.json").read_text())
            self.assertEqual(assessment["assessment_status"], "needs_review")
            self.assertTrue(assessment["automatic_checks_passed"])
            self.assertEqual(len(assessment["pending_reviews"]), 2)
            path = root / "results/simplify/current/x/00/task.json"
            data = json.loads(path.read_text())
            data["final_status"] = "FAILURE"
            data["success_criteria_results"][0].update({"score": 0, "error": "OSError: test"})
            path.write_text(json.dumps(data))
            self.assertEqual(summarize(root), 2)
            self.assertEqual(json.loads((root / "summary.json").read_text())["deltas"], [])


class Preparation(unittest.TestCase):
    def test_commit_catalogs_change_target_and_support_together(self):
        args = argparse.Namespace(
            candidate=None,
            suite="behavior",
            skill=None,
            case="review-clean",
            repeats=1,
            model="test/model",
            timeout=90,
        )
        with (
            tempfile.TemporaryDirectory() as temp,
            patch("pilot.subprocess.check_output", return_value="1.18.31\n"),
            patch("pilot.shutil.which", return_value="/test/opencode"),
        ):
            root = Path(temp)
            pilot.bundle(root / "source", pilot.CATALOG)
            changed = {name: root / "source" / name for name in pilot.CATALOG}
            for name in ["code-review", "code-standards"]:
                skill = changed[name] / "SKILL.md"
                skill.write_text(skill.read_text() + "\nA test-only changed instruction.\n")
            output = root / "run"
            pilot.prepare(
                args,
                output,
                catalog_variants={"off": pilot.CATALOG, "on": changed},
                baseline_variant="off",
                comparison={"kind": "commit"},
            )
            manifest = json.loads((output / "manifest.json").read_text())
            self.assertEqual(manifest["baseline_variant"], "off")
            self.assertEqual(set(manifest["bundles"]), {"code-review/off", "code-review/on"})
            for name in ["code-review", "code-standards"]:
                self.assertNotEqual(
                    manifest["bundles"]["code-review/off"][name],
                    manifest["bundles"]["code-review/on"][name],
                )
            self.assertEqual(
                manifest["bundles"]["code-review/off"]["unslop"],
                manifest["bundles"]["code-review/on"]["unslop"],
            )

    def test_native_schema_and_catalog(self):
        pilot.check()
        with self.assertRaises(Warning):
            pilot.validate_task({**pilot.base_tasks()[0], "misspelled": True})
        for task in pilot.routing_tasks():
            self.assertTrue(all(c["weight"] == 0 for c in task["success_criteria"]))

    def test_bundles_exclude_evals_and_control_removes_only_target(self):
        args = argparse.Namespace(
            candidate=None,
            suite="behavior",
            skill="code-review",
            case="review-clean",
            repeats=2,
            model="test/model",
            timeout=90,
        )
        with (
            tempfile.TemporaryDirectory() as temp,
            patch("pilot.subprocess.check_output", return_value="1.18.31\n"),
            patch("pilot.shutil.which", return_value="/test/opencode"),
        ):
            root = Path(temp)
            experiments, env = pilot.prepare(args, root)
            current = root / "bundles/code-review/current/skills"
            absent = root / "bundles/code-review/absent/skills"
            self.assertTrue((current / "code-review/SKILL.md").is_file())
            self.assertFalse((absent / "code-review").exists())
            self.assertFalse(list(current.rglob("evals")))
            for name in ["simplify", "unslop", "code-standards"]:
                self.assertEqual(
                    (current / name / "SKILL.md").read_bytes(),
                    (absent / name / "SKILL.md").read_bytes(),
                )
            data = yaml.safe_load(experiments[0][0].read_text())
            self.assertEqual(data["defaults"]["repeats"], 2)
            self.assertTrue((Path(env["SKILL_EVALS_ROOT"]) / "check.mjs").is_file())
            # Setup and grading source are frozen; the candidate only gets bundles.
            self.assertNotEqual(env["SETUP_ROOT"], str(pilot.ROOT))

    def test_candidate_replaces_only_target_and_preserves_other_skills(self):
        args = argparse.Namespace(
            candidate=str(pilot.CATALOG["simplify"]),
            suite="behavior",
            skill="simplify",
            case="simplify-behavior",
            repeats=1,
            model="test/model",
            timeout=90,
        )
        with (
            tempfile.TemporaryDirectory() as temp,
            patch("pilot.subprocess.check_output", return_value="1.18.31\n"),
            patch("pilot.shutil.which", return_value="/test/opencode"),
        ):
            pilot.prepare(args, Path(temp))
            manifest = json.loads((Path(temp) / "manifest.json").read_text())
            self.assertEqual(
                manifest["bundles"]["simplify/current"], manifest["bundles"]["simplify/candidate"]
            )
            self.assertNotIn("simplify", manifest["bundles"]["simplify/absent"])

    def test_inherited_home_paths_and_config_do_not_reach_candidate(self):
        env = isolated_env(
            {
                "PATH": "/bin",
                "HOME": "/real/home",
                "OPENCODE_CONFIG": "/host/secret-config.json",
                "OPENCODE_CONFIG_CONTENT": '{"skills":{"paths":["/host/skills"]}}',
                "SETUP_ROOT": "/host/repo",
                "OPENAI_API_KEY": "test-only",
            },
            Path("/private/home"),
            configuration(["/prepared/skills"]),
        )
        self.assertEqual(env["HOME"], "/private/home")
        self.assertNotIn("OPENCODE_CONFIG", env)
        self.assertNotIn("SETUP_ROOT", env)
        self.assertEqual(
            json.loads(env["OPENCODE_CONFIG_CONTENT"])["skills"]["paths"], ["/prepared/skills"]
        )

    def test_remote_auth_and_effective_instructions_are_rejected(self):
        records = {
            "openai": {"type": "oauth", "access": "fake-test-only"},
            "https://example.invalid": {"type": "wellknown", "token": "fake-test-only"},
        }
        self.assertEqual(provider_auth(records, "openai"), {"openai": records["openai"]})
        with self.assertRaises(ValueError):
            provider_auth(records, "https://example.invalid")
        with self.assertRaises(ValueError):
            validate_effective_config({"instructions": ["/host/instructions.md"]})

    def test_isolation_runs_real_subprocess_and_refuses_extra_skill(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            skills = root / "bundles/skills"
            (skills / "simplify").mkdir(parents=True)
            (skills / "simplify/SKILL.md").write_text("test fixture")
            (root / "audit").mkdir()
            (root / "work").mkdir()
            fake = root / "opencode-fake"
            fake.write_text(
                f"#!{sys.executable}\n"
                + """import json, os, sys
from pathlib import Path
config = json.loads(os.environ["OPENCODE_CONFIG_CONTENT"])
assert "OPENCODE_CONFIG" not in os.environ
assert "SETUP_ROOT" not in os.environ
names = ["customize-opencode", "simplify"]
if (Path.cwd() / "extra").exists(): names.append("leaked-host-skill")
if sys.argv[1:3] == ["debug", "config"]: print("{}")
elif sys.argv[1] == "debug": print(json.dumps([{"name": n} for n in names]))
else: print(json.dumps({"home": os.environ["HOME"], "skills": config["skills"]["paths"]}))
"""
            )
            fake.chmod(0o755)
            env = {
                **os.environ,
                "SKILL_EVALS_OPENCODE": str(fake),
                "SKILL_EVALS_BUNDLES": str(root / "bundles"),
                "SKILL_EVALS_AUDIT": str(root / "audit"),
                "SKILL_EVALS_AUTH": str(root / "missing-auth"),
                "OPENCODE_CONFIG_CONTENT": json.dumps({"skills": {"paths": [str(skills)]}}),
            }
            command = [
                sys.executable,
                str(pilot.HERE / "isolate.py"),
                "run",
                "--dir",
                str(root / "work"),
                "-m",
                "test/model",
                "--",
                "Test",
            ]
            for _ in range(2):
                result = subprocess.run(
                    command,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertFalse(Path(json.loads(result.stdout)["home"]).exists())
            (root / "work/extra").touch()
            result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Catalog mismatch", result.stderr)
            self.assertEqual(len(list((root / "audit").glob("*.json"))), 3)


if __name__ == "__main__":
    unittest.main()
