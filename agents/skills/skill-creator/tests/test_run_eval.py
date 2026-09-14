import json
import os
import shlex
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.run_eval import run_eval, run_single_query


class RunEvalTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.logs = self.root / "logs"
        self.logs.mkdir()
        binary = self.root / "claude"
        fixture = Path(__file__).with_name("fake_claude.py")
        binary.write_text(
            f'#!/bin/sh\nexec {shlex.quote(sys.executable)} -B {shlex.quote(str(fixture))} "$@"\n'
        )
        binary.chmod(0o755)
        environment = patch.dict(os.environ, {
            "PATH": f"{self.root}:{os.environ.get('PATH', '')}",
            "FAKE_CLAUDE_LOG": str(self.logs),
            "CLAUDECODE": "test-parent",
        })
        environment.start()
        self.addCleanup(environment.stop)

    def run_query(self, query, timeout=5):
        return run_single_query(query, "test-skill", "Use for exact tasks.", timeout, "sonnet")

    def assert_contexts_removed(self):
        records = [json.loads(p.read_text()) for p in self.logs.glob("*.json")]
        self.assertTrue(records)
        for record in records:
            self.assertFalse(Path(record["cwd"]).exists())
            self.assertEqual(len(record["commands"]), 1)
            self.assertEqual(record["argv"][-2:], ["--model", "sonnet"])
            self.assertNotIn("--include-partial-messages", record["argv"])
            self.assertNotIn("--bare", record["argv"])
            self.assertNotIn("--safe-mode", record["argv"])
            self.assertNotIn("--setting-sources", record["argv"])
            self.assertNotIn("--dangerously-skip-permissions", record["argv"])
            self.assertEqual(record["home"], os.environ.get("HOME"))
            self.assertEqual(record["config_dir"], os.environ.get("CLAUDE_CONFIG_DIR"))
        return records

    def test_reads_all_selection_messages_through_success(self):
        for query in ("positive", "buffered"):
            with self.subTest(query=query):
                self.assertTrue(self.run_query(query))
        self.assertFalse(self.run_query("negative"))
        self.assert_contexts_removed()

    def test_errors_after_trigger_and_without_trigger_never_return_false(self):
        for query in (
            "exit-error", "result-error", "turn-limit", "tool-error",
            "tool-error-negative", "assistant-error", "permission-denied",
            "missing-result", "malformed",
            "read", "similar-name", "similar-path", "outside-search", "substitute",
            "missing-receipt", "no-init", "extra-tools", "extra-mcp",
        ):
            with self.subTest(query=query):
                with self.assertRaises(RuntimeError):
                    self.run_query(query)
        with self.assertRaises(subprocess.TimeoutExpired):
            self.run_query("timeout", timeout=0.2)
        self.assert_contexts_removed()
        self.assertTrue(self.run_query("positive"))
        self.assert_contexts_removed()

    def test_negative_case_error_aborts_batch_and_next_run_recovers(self):
        for query in ("exit-error", "tool-error-negative", "missing-result", "contaminated-negative"):
            with self.subTest(query=query), self.assertRaisesRegex(RuntimeError, "no scores"):
                run_eval([{"query": query, "should_trigger": False}],
                         "sample", "Exact tasks.", 1, 5, model="sonnet")
        output = run_eval([{"query": "negative", "should_trigger": False}],
                          "sample", "Exact tasks.", 1, 5, model="sonnet")
        self.assertEqual(output["summary"], {"passed": 1, "failed": 0, "total": 1})
        self.assertEqual(output["results"][0]["trigger_rate"], 0)
        self.assert_contexts_removed()

    def test_concurrent_repetitions_have_separate_contexts(self):
        cases = [{"query": "concurrent-one", "should_trigger": True},
                 {"query": "concurrent-two", "should_trigger": True}]
        for _ in range(2):
            output = run_eval(cases, "sample", "Exact tasks.", 2, 10,
                              runs_per_query=2, model="sonnet")
            self.assertEqual(output["runner"], "claude")
            self.assertEqual(output["model"], "sonnet")
            self.assertEqual(output["summary"]["passed"], 2)
            self.assertEqual([r["runs"] for r in output["results"]], [2, 2])
        records = self.assert_contexts_removed()
        self.assertEqual(len(records), 8)
        self.assertEqual(len({r["cwd"] for r in records}), 8)

    def test_missing_executable_is_an_error(self):
        with patch.dict(os.environ, {"PATH": "/nonexistent"}):
            with self.assertRaises(FileNotFoundError):
                self.run_query("negative")

    def test_catalog_contamination_never_scores(self):
        for query in ("contaminated", "contaminated-negative", "missing-candidate"):
            with self.subTest(query=query), self.assertRaisesRegex(RuntimeError, "catalog"):
                self.run_query(query)

    def test_guard_blocks_substitution_and_file_actions_without_allow_override(self):
        script = Path(__file__).parents[1] / "scripts" / "selection_guard.py"
        for request, expected in (
            ({"tool_name": "Skill", "tool_input": {"skill": "candidate"}}, 0),
            ({"tool_name": "EndConversation", "tool_input": {}}, 0),
            ({"tool_name": "Skill", "tool_input": {"skill": "candidate-other"}}, 2),
            ({"tool_name": "Skill", "tool_input": {"skill": "installed-original"}}, 2),
            ({"tool_name": "Read", "tool_input": {"file_path": "/tmp/other/SKILL.md"}}, 2),
            ({"tool_name": "Bash", "tool_input": {"command": "find /"}}, 2),
            ({}, 2),
            (None, 2),
        ):
            with self.subTest(request=request):
                result = subprocess.run([sys.executable, "-B", str(script), "candidate"],
                                        input=json.dumps(request), capture_output=True, text=True)
                self.assertEqual(result.returncode, expected, result.stderr)
                self.assertEqual(result.stdout, "")

    def test_invalid_models_and_inputs_fail_before_execution(self):
        with patch("scripts.run_eval.subprocess.run") as command:
            for model in ("openai/gpt-6-astra", "gpt-6-astra", ""):
                with self.subTest(model=model), self.assertRaisesRegex(ValueError, "Claude-only"):
                    run_single_query("negative", "sample", "Exact tasks.", 5, model)
            command.assert_not_called()
        case = {"query": "negative", "should_trigger": False}
        for cases in ([], [case, case]):
            with self.assertRaisesRegex(ValueError, "unique"):
                run_eval(cases, "sample", "Exact tasks.", 1, 5)

    def test_cli_success_and_error_exit(self):
        skill = self.root / "skill"
        skill.mkdir()
        (skill / "SKILL.md").write_text("---\nname: sample\ndescription: Exact tasks.\n---\nBody")
        cases = self.root / "queries.json"
        command = [sys.executable, "-B", "-m", "scripts.run_eval", "--eval-set", str(cases),
                   "--skill-path", str(skill), "--model", "sonnet", "--num-workers", "1",
                   "--runs-per-query", "1"]
        for query in ("negative", "tool-error-negative"):
            cases.write_text(json.dumps([{"query": query, "should_trigger": False}]))
            result = subprocess.run(command, capture_output=True, text=True, timeout=10)
            if query == "negative":
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(json.loads(result.stdout)["summary"]["passed"], 1)
            else:
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, "")
                self.assertIn("no scores produced", result.stderr)

    def test_loop_cli_uses_isolated_evaluator(self):
        skill = self.root / "skill"
        skill.mkdir()
        (skill / "SKILL.md").write_text("---\nname: sample\ndescription: Exact tasks.\n---\nBody")
        cases = self.root / "queries.json"
        cases.write_text(json.dumps([{"query": "negative", "should_trigger": False}]))
        command = [sys.executable, "-B", "-m", "scripts.run_loop", "--eval-set", str(cases),
                   "--skill-path", str(skill), "--model", "sonnet", "--num-workers", "1",
                   "--runs-per-query", "1", "--max-iterations", "1", "--holdout", "0",
                   "--report", "none"]
        result = subprocess.run(command, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        output = json.loads(result.stdout)
        self.assertEqual(output["best_score"], "1/1")
        self.assertEqual(output["runner"], "claude")
        self.assertEqual(output["model"], "sonnet")
        self.assert_contexts_removed()


if __name__ == "__main__":
    unittest.main()
