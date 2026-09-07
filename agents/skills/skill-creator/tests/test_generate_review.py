import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


def load_generate_review():
    path = Path(__file__).parents[1] / "eval-viewer" / "generate_review.py"
    spec = importlib.util.spec_from_file_location("generate_review", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


generate_review = load_generate_review()


class GenerateReviewTests(unittest.TestCase):
    def test_finds_eval_metadata_above_configuration_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            eval_dir = root / "eval-1"
            run_dir = eval_dir / "with_skill" / "run-1"
            (run_dir / "outputs").mkdir(parents=True)
            (eval_dir / "eval_metadata.json").write_text(
                json.dumps({"eval_id": 1, "eval_name": "routing", "prompt": "route me"})
            )

            run = generate_review.build_run(root, run_dir)

        self.assertEqual(run["prompt"], "route me")
        self.assertEqual(run["eval_id"], 1)


if __name__ == "__main__":
    unittest.main()
