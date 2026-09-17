import copy
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from commit_eval import snapshot_catalogs
from expanded import discover, make_study, native_case, snapshot_working_cases, write_coverage
from pilot import HERE, load_json

# The committed catalog must contain every skill the cases and routing labels name.
REVISION = "HEAD"
CACHE_REASON = "I kept the cache because offline preview lets me read pages on the train."


class ExpandedChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.snapshot.cleanup)
        cls.skill_catalog = snapshot_catalogs(
            {"on": REVISION}, Path(cls.snapshot.name), all_skills=True
        )["on"]
        cls.catalog = snapshot_working_cases(Path(cls.snapshot.name) / "current-evals")
        cls.entries = {entry["skill"]: entry for entry in load_json(HERE / "expanded_cases.json")}

    def run_checks(self, skill, outputs):
        task, files, _ = native_case(self.entries[skill], self.catalog)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            work, graders = root / "work", root / "graders"
            work.mkdir()
            graders.mkdir()
            env = {**os.environ, "SKILL_EVALS_ROOT": str(graders)}
            for source, target in files:
                destination = graders / target
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(source.read_bytes())
            for setup in task["pre_run"]:
                subprocess.run(
                    setup["command"],
                    shell=True,
                    executable="/bin/bash",
                    cwd=work,
                    env=env,
                    check=True,
                    capture_output=True,
                    timeout=10,
                )
            for name, content in outputs.items():
                path = work / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(
                    json.dumps(content) if isinstance(content, (dict, list)) else content
                )
            passed = True
            for check in task["success_criteria"]:
                if check["type"] == "skill_triggered":
                    continue
                if check["type"] == "file_exists":
                    passed &= (work / check["path"]).is_file()
                    continue
                result = subprocess.run(
                    check["command"],
                    shell=True,
                    executable="/bin/bash",
                    cwd=work,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                passed &= (
                    result.returncode == 0 and result.stdout.strip() == check["expected_stdout"]
                )
            return passed

    def test_revision_discovery_and_profiles(self):
        discovered = discover(REVISION)
        self.assertEqual(len(discovered), len(self.skill_catalog))
        self.assertTrue(self.entries.keys() <= discovered.keys())
        catalogs = {"on": self.skill_catalog, "off": self.skill_catalog}
        full = make_study(catalogs, "behavior", "full", case_catalog=self.catalog)
        self.assertEqual(len(full["tasks"]), 12)
        self.assertEqual(len(full["behavior_skills"]), 8)
        routing = make_study(catalogs, "routing", "full", case_catalog=self.catalog)
        self.assertEqual(len(routing["tasks"]), 24)
        self.assertTrue(
            all(c["weight"] == 0 for t in routing["tasks"] for c in t["success_criteria"])
        )

    def test_current_case_snapshot_is_separate_from_source(self):
        relative = "evals/cases/direct-complete-review.yaml"
        current_case = (self.catalog["write-blog-post"] / relative).read_bytes()
        with tempfile.TemporaryDirectory() as temp:
            first = snapshot_working_cases(Path(temp) / "first")
            second = snapshot_working_cases(Path(temp) / "second")
            changed = first["write-blog-post"] / relative
            changed.write_text("Changed only the disposable snapshot.")
            self.assertEqual((second["write-blog-post"] / relative).read_bytes(), current_case)
            self.assertEqual(
                (self.catalog["write-blog-post"] / relative).read_bytes(), current_case
            )

    def test_focused_coverage_counts_only_selected_tasks_and_loaded_skills(self):
        catalogs = {"off": self.skill_catalog, "on": self.skill_catalog}
        study = make_study(catalogs, "behavior", "focused", case_catalog=self.catalog)
        task = "expanded-write-blog-post-direct-complete-review"
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "manifest.json").write_text(
                json.dumps(
                    {
                        "expected": [{"task": task, "variant": variant} for variant in catalogs],
                        "bundles": {
                            f"write-blog-post/{variant}": {
                                name: "hash"
                                for name in ["write-blog-post", "unslop", "write-draft-blog-post"]
                            }
                            for variant in catalogs
                        },
                    }
                )
            )
            write_coverage(root, catalogs, study)
            coverage = load_json(root / "coverage.json")
            for row in coverage.values():
                self.assertEqual(row["behavioral_cases"], ["write-blog-post"])
                self.assertEqual(row["positive_routing_cases"], [])
                self.assertEqual(len(row["available"]), 3)
                self.assertEqual(len(row["discovered"]), len(self.skill_catalog))

    def test_contract_safeguards(self):
        good = {
            "deduplicate_now": True,
            "adopt_result": False,
            "wrap_label": False,
            "reasons": [
                "Duplicate delivery is documented.",
                "Use typed exceptions.",
                "No invariant.",
            ],
        }
        self.assertTrue(self.run_checks("code-standards", {"decisions.json": good}))
        for name in ["deduplicate_now", "adopt_result", "wrap_label"]:
            bad = {**good, name: not good[name]}
            self.assertFalse(self.run_checks("code-standards", {"decisions.json": bad}))

    def test_preserve_comment_constraints(self):
        original = (self.catalog["comment-purge"] / "evals/fixtures/normalize.mjs").read_text()
        good = original.replace("  // Convert the value to a string.\n", "")
        outputs = {"normalize.mjs": good, "cleanup.md": "Importer contract remains unresolved."}
        self.assertTrue(self.run_checks("comment-purge", outputs))
        for bad in [
            "\n".join(s for s in good.split("\n") if "IMPORTANT" not in s),
            "\n".join(s for s in good.split("\n") if "Copyright" not in s),
            good.replace("text.trim().toLowerCase()", "text.toLowerCase()"),
        ]:
            self.assertFalse(self.run_checks("comment-purge", {**outputs, "normalize.mjs": bad}))

    def test_tdd_decisions(self):
        good = {
            "interface": ["createUser", "getUser"],
            "approval_question": None,
            "phases": ["write-test", "run-red", "implement", "run-green", "refactor"],
            "behaviors_this_cycle": 1,
            "assertions": ["id", "name"],
            "next_behavior": "backlog",
        }
        self.assertTrue(self.run_checks("tdd", {"decision.json": good}))
        for key, value in [
            ("approval_question", "Approve the interface?"),
            ("phases", ["implement", "write-test", "run-red", "run-green", "refactor"]),
            ("assertions", ["name"]),
        ]:
            self.assertFalse(self.run_checks("tdd", {"decision.json": {**good, key: value}}))

    def test_blog_review_boundaries(self):
        task, _, _ = native_case(self.entries["write-blog-post"], self.catalog)
        self.assertIn("review.md itself must contain one JSON object", task["initial_prompt"])
        good = {
            "findings": [
                {
                    "source_quote": "My first build took 40 seconds.",
                    "observation": "The measurement lacks a before-cache comparison.",
                }
            ],
            "blocking_questions": [],
            "draft_action": "unchanged",
        }
        self.assertTrue(self.run_checks("write-blog-post", {"review.md": good}))
        for outputs in [
            {"review.md": {**good, "blocking_questions": ["Who is the audience?"]}},
            {"review.md": good, "draft.md": "Edited without authorization.\n"},
            {"review.md": {**good, "findings": []}},
        ]:
            self.assertFalse(self.run_checks("write-blog-post", outputs))
        # This grader establishes the boundary, not the quality of a finding.
        self.assertFalse(
            self.run_checks(
                "write-blog-post", {"review.md": {**good, "findings": ["Unrelated nonsense."]}}
            )
        )
        self.assertTrue(
            self.run_checks(
                "write-blog-post",
                {
                    "review.md": {
                        **good,
                        "findings": [
                            {
                                "source_quote": "My first build took 40 seconds.",
                                "observation": "Unrelated nonsense.",
                            }
                        ],
                    }
                },
            )
        )

    def post_outputs(self):
        draft = (self.catalog["post-draft"] / "evals/fixtures/partial-cache.md").read_text()
        draft = draft.replace(
            "next: explain the author's cache choice", "next: obtain cold-start measurements"
        )
        draft = draft.replace(
            "[Q: Why did I keep the cache?]",
            "I kept the cache because offline preview lets me read pages on the train.",
        )
        return {
            "src/content/posts/cache-notebook.md": draft,
            "progress.md": {
                "evidence_source": "source-notes.md",
                "answered_interview_rounds": 0,
                "status": "partial",
                "added_passages": [
                    {
                        "text": CACHE_REASON,
                        "source_quotes": [CACHE_REASON],
                    }
                ],
                "cold_start_claims": [],
            },
        }

    def test_post_evidence_and_unresolved_gaps(self):
        good = self.post_outputs()
        self.assertTrue(self.run_checks("post-draft", good))
        draft_path = "src/content/posts/cache-notebook.md"
        self.assertFalse(
            self.run_checks(
                "post-draft",
                {**good, draft_path: good[draft_path].replace("state: partial", "state: complete")},
            )
        )
        self.assertFalse(
            self.run_checks(
                "post-draft",
                {**good, draft_path: good[draft_path].replace("blue drawer", "green drawer")},
            )
        )
        bad = copy.deepcopy(good)
        bad[draft_path] += "\nMy cold start was 12 ms.\n"
        bad["progress.md"]["cold_start_claims"] = [
            {
                "text": "My cold start was 12 ms.",
                "subject": "author",
                "status": "measured",
                "milliseconds": 12,
                "source_quote": "An external report says its author measured a 12 ms cold start.",
            }
        ]
        self.assertFalse(self.run_checks("post-draft", bad))
        # New prose cannot be omitted from the paragraph ledger.
        bad = copy.deepcopy(good)
        bad[draft_path] = bad[draft_path].replace(
            "## What is still unknown?", "My cold start was 12 ms.\n\n## What is still unknown?"
        )
        self.assertFalse(self.run_checks("post-draft", bad))
        bad["progress.md"]["added_passages"].append(
            {
                "text": "My cold start was 12 ms.",
                "source_quotes": [
                    "An external report says its author measured a 12 ms cold start."
                ],
            }
        )
        # Citation completeness cannot establish correct attribution.
        self.assertTrue(self.run_checks("post-draft", bad))

    def test_spec_draft_scope(self):
        good = {
            "problem": "Members need order data.",
            "solution": "Export their orders as CSV.",
            "stories": [{"actor": "member", "feature": "export-own-orders-csv", "benefit": None}],
            "interfaces": ["exportOrders"],
            "testing_decisions": [],
            "open_questions": ["Retention duration"],
            "interview_questions": [],
            "publication": {"status": "draft", "url": None, "required_labels": ["spec"]},
        }
        self.assertTrue(self.run_checks("to-spec", {"spec.json": good}))
        for key, value in [
            ("testing_decisions", ["Use unit tests"]),
            (
                "publication",
                {
                    "status": "published",
                    "url": "https://example.invalid/1",
                    "required_labels": ["spec"],
                },
            ),
            ("stories", [{"actor": "member", "feature": "export-orders-pdf", "benefit": None}]),
        ]:
            self.assertFalse(self.run_checks("to-spec", {"spec.json": {**good, key: value}}))


if __name__ == "__main__":
    unittest.main()
