"""Small Coder Eval pilot: native tasks, controlled skill bundles, separate scores."""

import argparse
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path

import yaml
from coder_eval.models.tasks import TaskDefinition, UnknownTaskFieldWarning

from isolate import BUILTIN_SKILLS
from report import summarize

HERE = Path(__file__).resolve().parent
_TOPLEVEL = ["git", "-C", str(HERE), "rev-parse", "--show-toplevel"]
ROOT = Path(subprocess.check_output(_TOPLEVEL, text=True).strip())
CATALOG = {
    "code-review": ROOT / "terminal/opencode/skills/code-review",
    "simplify": ROOT / "terminal/opencode/skills/simplify",
    "code-standards": ROOT / "agents/skills/code-standards",
    "unslop": ROOT / "agents/skills/unslop",
}
TARGETS = {"code-review", "simplify"}
EXCLUDED = {"evals", ".git", "node_modules", "__pycache__"}
FIXTURES = {
    "code-review": ["sql-injection.diff", "trivial-rename.diff"],
    "simplify": ["sloppy.mjs", "bloated.mjs"],
}


def load_json(path):
    return json.loads(path.read_text())


def validate_task(task):
    with warnings.catch_warnings():
        warnings.simplefilter("error", UnknownTaskFieldWarning)
        TaskDefinition.model_validate(task)


def skill_files(path):
    for item in sorted(path.rglob("*")):
        if EXCLUDED.intersection(item.relative_to(path).parts):
            continue
        if item.is_symlink():
            raise ValueError(f"Linked skill source must be resolved before evaluation: {item}")
        if item.is_file():
            yield item


def validate_catalog(catalog, link_warnings=None):
    descriptions = {}
    for name, path in catalog.items():
        files = list(skill_files(path))
        text = (path / "SKILL.md").read_text()
        front = yaml.safe_load(text.split("---", 2)[1])
        if front["name"] != name or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
            raise ValueError(f"Invalid skill name: {name}")
        if not isinstance(front.get("description"), str) or not front["description"].strip():
            raise ValueError(f"Missing description: {name}")
        descriptions[name] = front["description"]
        for file in files:
            if file.suffix != ".md":
                continue
            for link in re.findall(r"\]\(([^\s)]+)\)", file.read_text()):
                if ":" in link or link.startswith("#") or "<" in link:
                    continue
                target = (file.parent / link.split("#")[0]).resolve()
                in_catalog = any(target.is_relative_to(root.resolve()) for root in catalog.values())
                if not in_catalog or not target.exists():
                    message = f"Broken or external local reference in {file}: {link}"
                    if link_warnings is None:
                        raise ValueError(message)
                    link_warnings.append(message)
    return descriptions


def base_tasks():
    tasks = [yaml.safe_load(path.read_text()) for path in sorted((HERE / "tasks").glob("*.yaml"))]
    indexed = {t["task_id"]: t for t in tasks}
    if len(indexed) != len(tasks):
        raise ValueError("Duplicate task ids")
    for pressure in load_json(HERE / "pressure.json"):
        base = indexed[pressure["task"]]
        tasks.append(
            {
                **base,
                "task_id": base["task_id"] + "-pressure",
                "tags": [*base["tags"], "pressure"],
                "initial_prompt": base["initial_prompt"] + "\n" + pressure["suffix"],
            }
        )
    return tasks


def routing_tasks():
    fixtures = {t["task_id"]: t for t in base_tasks()}
    tasks = []
    for row in load_json(HERE / "routing.json"):
        required, allowed = set(row["required"]), set(row["allowed"])
        if not required <= allowed <= CATALOG.keys():
            raise ValueError(f"Invalid routing labels: {row['id']}")
        criteria = []
        for name in [*CATALOG, *BUILTIN_SKILLS]:
            if name in allowed and name not in required:
                continue
            criteria.append(
                {
                    "type": "skill_triggered",
                    "description": f"routing:{name}",
                    "skill_name": name,
                    "expected_skill": name if name in required else "",
                    "weight": 0,
                }
            )
        tasks.append(
            {
                "task_id": "route-" + row["id"],
                "description": row["prompt"],
                "initial_prompt": row["prompt"],
                "tags": ["routing"],
                "pre_run": fixtures[row["fixture"]]["pre_run"] if row.get("fixture") else [],
                "success_criteria": criteria,
            }
        )
    if len({t["task_id"] for t in tasks}) != len(tasks):
        raise ValueError("Duplicate routing ids")
    return tasks


def check():
    descriptions = validate_catalog(CATALOG)
    for name, files in FIXTURES.items():
        for file in files:
            if not (CATALOG[name] / "evals/fixtures" / file).is_file():
                raise ValueError(f"Missing fixture: {name}/{file}")
    tasks = base_tasks() + routing_tasks()
    for task in tasks:
        validate_task(task)
    # Vocabulary overlap is advisory, never a substitute for measured routing.
    for index, (name, description) in enumerate(descriptions.items()):
        words = set(re.findall(r"[a-z]{4,}", description.lower()))
        for other, text in list(descriptions.items())[index + 1 :]:
            other_words = set(re.findall(r"[a-z]{4,}", text.lower()))
            overlap = len(words & other_words) / len(words | other_words)
            if overlap >= 0.4:
                print(f"Advisory: description overlap {name}/{other}: {overlap:.0%}")
    print(f"Validated {len(CATALOG)} skills and {len(tasks)} native tasks (including pressure).")


def bundle(destination, catalog):
    hashes = {}
    for name, source in catalog.items():
        digest = hashlib.sha256()
        for file in skill_files(source):
            relative = file.relative_to(source)
            data = file.read_bytes()
            target = destination / name / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            shutil.copymode(file, target)
            digest.update(str(relative).encode() + b"\0" + data + b"\0")
        hashes[name] = digest.hexdigest()
    return hashes


def prepare(
    args,
    directory,
    *,
    catalog_variants=None,
    comparison=None,
    baseline_variant="absent",
    token_limit=100000,
    study=None,
):
    check()
    study = study or {}
    real = shutil.which("opencode")
    if not real:
        raise ValueError("Install OpenCode before preparing the pilot")
    version = subprocess.check_output([real, "--version"], text=True).strip()
    catalog = dict(CATALOG)
    link_warnings = []
    if catalog_variants:
        if args.candidate or baseline_variant not in catalog_variants:
            raise ValueError("Named catalogs require their own baseline and no --candidate")
        for name, selected in catalog_variants.items():
            if not re.fullmatch(r"[a-z][a-z0-9-]*", name) or (
                not study and set(selected) != set(CATALOG)
            ):
                raise ValueError("Invalid named catalog")
            validate_catalog(selected, link_warnings if study else None)
    candidate = None
    if args.candidate:
        if args.suite != "behavior" or args.skill not in TARGETS:
            raise ValueError("--candidate requires --suite behavior and --skill")
        candidate = {**catalog, args.skill: Path(args.candidate).resolve()}
        validate_catalog(candidate)
    tasks = study.get("tasks")
    if tasks is None:
        tasks = base_tasks() if args.suite == "behavior" else routing_tasks()
    if args.skill:
        tasks = [t for t in tasks if args.skill in t["tags"]]
    if args.case:
        tasks = [t for t in tasks if t["task_id"] == args.case]
    if not tasks:
        raise ValueError("No tasks selected")
    directory.mkdir(parents=True, exist_ok=True)
    bins = directory / "bin"
    bins.mkdir()
    shim = bins / "opencode"
    shim.write_text(
        f"#!/bin/sh\nexec {shlex.quote(sys.executable)} "
        f'{shlex.quote(str(HERE / "isolate.py"))} "$@"\n'
    )
    shim.chmod(0o755)
    (directory / "audit").mkdir()
    labels = study.get("routing_labels", load_json(HERE / "routing.json"))
    (directory / "routing-labels.json").write_text(json.dumps(labels, indent=2) + "\n")
    grader_root = directory / "grader"
    checker_root = grader_root / HERE.relative_to(ROOT)
    checker_root.mkdir(parents=True)
    shutil.copyfile(HERE / "check.mjs", checker_root / "check.mjs")
    for name, files in FIXTURES.items():
        target = grader_root / f"terminal/opencode/skills/{name}/evals/fixtures"
        target.mkdir(parents=True)
        for file in files:
            shutil.copyfile(CATALOG[name] / "evals/fixtures" / file, target / file)
    for source, relative in study.get("files", []):
        target = checker_root / relative
        if not target.resolve().is_relative_to(checker_root.resolve()):
            raise ValueError(f"Escaping grader fixture: {relative}")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    bundles = directory / "bundles"
    manifests = {}
    targets = study.get("targets", {})
    groups = (
        sorted(
            {
                targets[t["task_id"]] if targets else next(s for s in TARGETS if s in t["tags"])
                for t in tasks
            }
        )
        if args.suite == "behavior"
        else ["catalog"]
    )
    experiments = []
    expected = []
    for group in groups:
        group_tasks = [t for t in tasks if group in t["tags"]] if group != "catalog" else tasks
        variants = (
            list(catalog_variants)
            if catalog_variants
            else (["current", "absent"] if group != "catalog" else ["current"])
        )
        if candidate:
            variants.append("candidate")
        arms = []
        for variant in variants:
            selected = (
                dict(catalog_variants[variant])
                if catalog_variants
                else dict(candidate if variant == "candidate" else catalog)
            )
            if variant == "absent" and not catalog_variants:
                del selected[group]
            if study.get("profile") == "focused" and group != "catalog":
                selected = {name: selected[name] for name in study["supports"][group]}
            location = bundles / group / variant / "skills"
            manifests[f"{group}/{variant}"] = bundle(location, selected)
            arms.append(
                {
                    "variant_id": variant,
                    "agent": {
                        "plugins": [{"type": "local", "path": str(location.parent)}],
                    },
                }
            )
            expected.extend(
                {"group": group, "variant": variant, "task": t["task_id"], "repeats": args.repeats}
                for t in group_tasks
            )
        experiment = {
            "experiment_id": group,
            "defaults": {
                "repeats": args.repeats,
                "agent": {
                    "type": "opencode",
                    "model": args.model,
                    "pure": True,
                    "permission_mode": "acceptEdits",
                    "allowed_tools": [],
                },
                "run_limits": {
                    "max_turns": 20,
                    "task_timeout": args.timeout + 60,
                    "turn_timeout": args.timeout,
                    "max_total_tokens": token_limit,
                    "count_cached_input": True,
                    "count_cache_creation": True,
                    "stop_early": False,
                },
            },
            "variants": arms,
        }
        path = directory / f"{group}.yaml"
        path.write_text(yaml.safe_dump(experiment, sort_keys=False))
        task_paths = []
        for task in group_tasks:
            task_path = directory / f"{task['task_id']}.yaml"
            task_path.write_text(yaml.safe_dump(task, sort_keys=False))
            task_paths.append(str(task_path))
        experiments.append((path, task_paths, group))
    manifest = {
        "schema_version": 1,
        "isolation_version": 2,
        "coder_eval": "0.12.1",
        "opencode": version,
        "model": args.model,
        "suite": args.suite,
        "baseline_variant": baseline_variant,
        "comparison": comparison,
        "catalog": [*study.get("catalog_names", CATALOG), *BUILTIN_SKILLS],
        "profile": study.get("profile", "pilot"),
        "manual_review_tasks": study.get(
            "manual_review_tasks",
            [task["task_id"] for task in tasks if "manual-review" in task["tags"]],
        ),
        "imports": study.get("imports", []),
        "structural_link_warnings": link_warnings,
        "bundles": manifests,
        "expected": expected,
        "grader_hashes": {
            str(p.relative_to(directory)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in grader_root.rglob("*")
            if p.is_file()
        },
        "source_hashes": {
            str(p.relative_to(HERE)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in [
                HERE / "check.mjs",
                HERE / "routing.json",
                HERE / "pressure.json",
                *sorted((HERE / "tasks").glob("*.yaml")),
            ]
        },
    }
    if study:
        manifest["source_hashes"].update(
            {
                name: hashlib.sha256((HERE / name).read_bytes()).hexdigest()
                for name in ["expanded.py", "expanded_cases.json", "expanded_routing.json"]
            }
        )
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    home = Path.home()
    env = dict(os.environ)
    for key in list(env):
        if key.startswith("OPENCODE_"):
            del env[key]
    env.update(
        {
            "TELEMETRY_ENABLED": "false",
            "SETUP_ROOT": str(grader_root),
            "SKILL_EVALS_ROOT": str(checker_root),
            "PATH": str(bins) + os.pathsep + env["PATH"],
            "SKILL_EVALS_OPENCODE": real,
            "SKILL_EVALS_BUNDLES": str(bundles),
            "SKILL_EVALS_AUDIT": str(directory / "audit"),
            "SKILL_EVALS_AUTH": str(
                Path(os.environ.get("XDG_DATA_HOME", home / ".local/share")) / "opencode/auth.json"
            ),
        }
    )
    return experiments, env


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["check", "plan", "run", "report"])
    parser.add_argument("--suite", choices=["behavior", "routing"], default="behavior")
    parser.add_argument("--skill", choices=sorted(TARGETS))
    parser.add_argument("--case")
    parser.add_argument("--candidate", help="Replacement skill directory; name must match --skill")
    parser.add_argument("--model", default="openai/gpt-6-astra")
    parser.add_argument("--repeats", type=int, choices=range(1, 11), default=3)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--run-dir", type=Path)
    args = parser.parse_args()
    if args.command == "check":
        check()
        return 0
    if args.command == "report":
        if not args.run_dir:
            parser.error("report requires --run-dir")
        return summarize(args.run_dir.resolve())
    if not 30 <= args.timeout <= 600:
        parser.error("--timeout must be between 30 and 600 seconds")
    if args.run_dir:
        directory = args.run_dir.resolve()
        if directory.exists():
            parser.error("Choose a fresh --run-dir; mixing runs would invalidate comparisons")
    else:
        (HERE / ".runs").mkdir(exist_ok=True)
        directory = Path(tempfile.mkdtemp(prefix=args.command + "-", dir=HERE / ".runs"))
    experiments, env = prepare(args, directory)
    print(f"Evidence: {directory}", flush=True)
    code = 0
    for experiment, tasks, group in experiments:
        command = [str(HERE / ".venv/bin/coder-eval"), args.command, *tasks, "-e", str(experiment)]
        if args.command == "run":
            command += ["--run-dir", str(directory / "results" / group), "--max-parallel", "1"]
        result = subprocess.run(command, cwd=directory, env=env, check=False)
        code = max(code, result.returncode)
    if args.command == "run":
        code = max(code, summarize(directory))
    return code


if __name__ == "__main__":
    sys.exit(main())
