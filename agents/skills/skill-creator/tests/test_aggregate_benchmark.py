import json
import tempfile
import unittest
from pathlib import Path

from scripts.aggregate_benchmark import generate_benchmark


class AggregateBenchmarkTests(unittest.TestCase):
    def write_run(self, root, config, pass_rate):
        run_dir = root / "eval-1" / config / "run-1"
        run_dir.mkdir(parents=True)
        (run_dir / "grading.json").write_text(
            json.dumps(
                {
                    "expectations": [],
                    "summary": {
                        "passed": int(pass_rate == 1),
                        "failed": int(pass_rate == 0),
                        "total": 1,
                        "pass_rate": pass_rate,
                    },
                }
            )
        )

    def test_orders_treatment_before_baseline_and_derives_run_count(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            eval_dir = root / "eval-1"
            eval_dir.mkdir()
            (eval_dir / "eval_metadata.json").write_text(
                json.dumps({"eval_id": 1, "eval_name": "routing", "prompt": "test"})
            )
            self.write_run(root, "old_skill", 0)
            self.write_run(root, "with_skill", 1)

            benchmark = generate_benchmark(root, "sample")

        self.assertEqual(
            [run["configuration"] for run in benchmark["runs"]],
            ["with_skill", "old_skill"],
        )
        self.assertEqual(benchmark["run_summary"]["delta"]["pass_rate"], "+1.00")
        self.assertEqual(benchmark["metadata"]["runs_per_configuration"], 1)
        self.assertEqual(benchmark["runs"][0]["eval_name"], "routing")


if __name__ == "__main__":
    unittest.main()
