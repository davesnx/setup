"""Compare pilot skill catalogs at a Git commit and its single parent."""

import argparse
import io
import json
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

from pilot import CATALOG, HERE, ROOT, prepare
from report import summarize


def revisions(commit):
    revision = subprocess.check_output(
        ["git", "rev-parse", "--verify", "--end-of-options", f"{commit}^{{commit}}"],
        cwd=ROOT,
        text=True,
    ).strip()
    lineage = subprocess.check_output(
        ["git", "rev-list", "--parents", "-n", "1", revision],
        cwd=ROOT,
        text=True,
    ).split()
    if len(lineage) != 2:
        raise ValueError("Choose a commit with exactly one parent")
    return {"off": lineage[1], "on": revision}


def snapshot_catalogs(refs, directory, all_skills=False):
    catalogs = {}
    for variant, revision in refs.items():
        if all_skills:
            from expanded import discover

            paths = discover(revision)
        else:
            paths = {name: path.relative_to(ROOT) for name, path in CATALOG.items()}
        destination = directory / variant
        destination.mkdir(parents=True)
        archive = subprocess.check_output(
            ["git", "archive", revision, *map(str, paths.values())],
            cwd=ROOT,
        )
        with tarfile.open(fileobj=io.BytesIO(archive)) as stream:
            stream.extractall(destination, filter="data")
        catalogs[variant] = {name: destination / path for name, path in paths.items()}
    return catalogs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["plan", "run"])
    parser.add_argument("--commit", required=True)
    parser.add_argument("--suite", choices=["behavior", "routing"], default="behavior")
    parser.add_argument("--repeats", type=int, choices=range(1, 11), default=2)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--model", default="openai/gpt-6-astra")
    parser.add_argument("--case")
    parser.add_argument(
        "--expanded",
        action="store_true",
        help="Discover revision catalogs and import six skill cases",
    )
    parser.add_argument("--profile", choices=["focused", "full"], default="full")
    parser.add_argument("--max-parallel", type=int, choices=range(1, 5), default=1)
    parser.add_argument(
        "--eval-source",
        choices=["working-tree", "on"],
        default="working-tree",
        help="Source for imported evals; held fixed across skill revisions",
    )
    parser.add_argument("--run-dir", type=Path)
    args = parser.parse_args()
    if not 30 <= args.timeout <= 600:
        parser.error("--timeout must be between 30 and 600 seconds")
    if args.profile == "focused" and (not args.expanded or args.suite != "behavior"):
        parser.error("--profile focused requires --expanded --suite behavior")
    refs = revisions(args.commit)
    if args.run_dir:
        directory = args.run_dir.resolve()
        if directory.exists():
            parser.error("Choose a fresh --run-dir")
        directory.mkdir(parents=True)
    else:
        (HERE / ".runs").mkdir(exist_ok=True)
        directory = Path(tempfile.mkdtemp(prefix="commit-", dir=HERE / ".runs"))
    catalogs = snapshot_catalogs(refs, directory / "sources", all_skills=args.expanded)
    scope = {
        variant: {
            name: str(path.relative_to(directory / "sources" / variant))
            for name, path in catalog.items()
        }
        for variant, catalog in catalogs.items()
    }
    comparison = {
        "kind": "commit",
        **refs,
        "scope": scope,
        "note": "Fixed harness, fixtures and graders. Catalogs come from their Git revisions.",
    }
    study = None
    if args.expanded:
        from expanded import make_study, snapshot_working_cases, write_coverage

        cases = (
            snapshot_working_cases(directory / "eval-sources")
            if args.eval_source == "working-tree"
            else None
        )
        comparison["eval_source"] = args.eval_source
        study = make_study(catalogs, args.suite, args.profile, case_catalog=cases)
    args.skill = None
    args.candidate = None
    experiments, env = prepare(
        args,
        directory,
        catalog_variants=catalogs,
        comparison=comparison,
        baseline_variant="off",
        token_limit=250000,
        study=study,
    )
    if study:
        write_coverage(directory, catalogs, study)
    print(
        json.dumps(
            {
                **refs,
                "profile": args.profile if args.expanded else "pilot",
                "catalog_sizes": {k: len(v) for k, v in catalogs.items()},
            },
            indent=2,
        ),
        flush=True,
    )
    print(f"Evidence: {directory}", flush=True)
    code = 0
    for experiment, tasks, group in experiments:
        command = [str(HERE / ".venv/bin/coder-eval"), args.command, *tasks, "-e", str(experiment)]
        if args.command == "run":
            command += [
                "--run-dir",
                str(directory / "results" / group),
                "--max-parallel",
                str(args.max_parallel),
            ]
        result = subprocess.run(command, cwd=directory, env=env, check=False)
        code = max(code, result.returncode)
    if args.command == "run":
        code = max(code, summarize(directory))
    return code


if __name__ == "__main__":
    sys.exit(main())
