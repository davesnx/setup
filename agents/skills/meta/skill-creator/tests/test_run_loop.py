import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.generate_report import generate_html
from scripts.improve_description import _call_claude, improve_description
from scripts.run_loop import run_loop


class RunLoopTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.skill = Path(self.temporary.name)
        (self.skill / "SKILL.md").write_text(
            "---\nname: sample\ndescription: Original description.\n---\nBody"
        )
        self.cases = [{"query": f"query-{index}", "should_trigger": index < 3}
                      for index in range(6)]
        self.options = dict(
            eval_set=self.cases, skill_path=self.skill, description_override=None,
            num_workers=1, timeout=5, max_iterations=2, runs_per_query=1,
            trigger_threshold=0.5, holdout=0.4, model="sonnet", verbose=False,
        )

    def test_validation_selects_iteration_but_is_hidden_from_improvement(self):
        def evaluate(**kwargs):
            improved = kwargs["description"] == "Revised description."
            results = []
            for index, case in enumerate(kwargs["eval_set"]):
                passed = improved if index < 4 else not improved
                triggered = case["should_trigger"] == passed
                results.append({**case, "pass": passed, "runs": 1,
                                "triggers": int(triggered), "trigger_rate": float(triggered)})
            return {"results": results}

        with patch("scripts.run_loop.run_eval", side_effect=evaluate) as evaluator:
            with patch("scripts.run_loop.improve_description", return_value="Revised description.") as improve:
                output = run_loop(**self.options)
        self.assertEqual(output["best_description"], "Original description.")
        self.assertEqual(output["final_description"], "Revised description.")
        self.assertEqual(output["selection_split"], "validation")
        self.assertEqual(output["best_test_score"], "2/2")
        self.assertEqual(evaluator.call_count, 2)
        self.assertEqual(improve.call_args.kwargs["model"], "sonnet")
        self.assertFalse(any(key.startswith("test_")
                             for key in improve.call_args.kwargs["history"][0]))
        report = generate_html(output)
        self.assertIn("used to select the best iteration", report)
        self.assertIn("not an untouched final evaluation", report)
        self.assertIn("<th>Validation</th>", report)
        self.assertNotIn("will apply", report)
        self.assertIn("Original description.", (self.skill / "SKILL.md").read_text())

    def test_evaluator_error_does_not_generate_or_select_description(self):
        with patch("scripts.run_loop.run_eval", side_effect=RuntimeError("runner failed")):
            with patch("scripts.run_loop.improve_description") as improve:
                with self.assertRaisesRegex(RuntimeError, "runner failed"):
                    run_loop(**self.options)
                improve.assert_not_called()

    def test_no_holdout_report_and_repeated_runs(self):
        def evaluate(**kwargs):
            return {"results": [{**case, "pass": True, "runs": 1,
                                  "triggers": int(case["should_trigger"])}
                                 for case in kwargs["eval_set"]]}

        with patch("scripts.run_loop.run_eval", side_effect=evaluate):
            first = run_loop(**{**self.options, "holdout": 0})
            second = run_loop(**{**self.options, "holdout": 0})
        self.assertEqual(first, second)
        self.assertEqual(first["selection_split"], "train")
        self.assertEqual(first["best_score"], "6/6")
        self.assertIn("(train)", generate_html(first))

    def test_claude_model_required_for_both_entrypoints(self):
        with patch("scripts.improve_description.subprocess.run") as command:
            with self.assertRaisesRegex(ValueError, "Claude-only"):
                _call_claude("test", "openai/gpt-6-astra")
            with self.assertRaisesRegex(ValueError, "Claude-only"):
                run_loop(**{**self.options, "model": "openai/gpt-6-astra"})
            command.assert_not_called()

    def test_improvement_prompt_preserves_scope_and_short_descriptions(self):
        results = {"results": [], "summary": {"passed": 0, "total": 0}}
        with patch("scripts.improve_description._call_claude", return_value="<new_description>Exact trigger.</new_description>") as command:
            description = improve_description("sample", "Body", "Old", results, [], "sonnet")
        self.assertEqual(description, "Exact trigger.")
        prompt = command.call_args.args[0]
        self.assertIn("exact triggers", prompt)
        self.assertIn("Preserve the skill's scope", prompt)
        self.assertIn("no\nminimum word count", prompt)
        self.assertNotIn("100-200", prompt)
        self.assertNotIn("competes", prompt)


if __name__ == "__main__":
    unittest.main()
