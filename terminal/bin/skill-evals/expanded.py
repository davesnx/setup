"""Revision catalog discovery and a bounded import of existing shell/file evals."""

import hashlib
import json
import re
import shlex
import subprocess
from pathlib import PurePosixPath

import yaml

from pilot import CATALOG, HERE, ROOT, base_tasks, load_json, validate_task

VENDORED = ("terminal/opencode/vendor/i-have-adhd/skills/i-have-adhd/SKILL.md",)


def snapshot_working_cases(directory):
    """Freeze current case definitions independently of the skills under comparison."""
    catalog = {}
    for entry in load_json(HERE / "expanded_cases.json"):
        skill = entry["skill"]
        source_root = (ROOT / "agents/skills" / skill / "evals").resolve()
        case_path = source_root / "cases" / f"{entry['case']}.yaml"
        if not source_root.is_relative_to(ROOT.resolve()) or not case_path.resolve().is_relative_to(
            source_root
        ):
            raise ValueError(f"Escaping case definition: {case_path}")
        data = case_path.read_bytes()
        case = yaml.safe_load(data)
        destination = directory / skill / "evals/cases" / case_path.name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        for relative in case.get("setup", {}).get("fixtures", {}).values():
            path = (source_root / relative).resolve()
            target = directory / skill / "evals" / relative
            if not path.is_relative_to(source_root) or not target.resolve().is_relative_to(
                directory.resolve()
            ):
                raise ValueError(f"Escaping case fixture: {relative}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(path.read_bytes())
        catalog[skill] = directory / skill
    return catalog


def discover(revision):
    paths = (
        subprocess.check_output(
            ["git", "ls-tree", "-r", "--name-only", "-z", revision],
            cwd=ROOT,
        )
        .decode()
        .split("\0")
    )
    skills = {}
    for path in paths:
        parts = PurePosixPath(path).parts
        direct = (len(parts) == 4 and parts[:2] == ("agents", "skills")) or (
            len(parts) == 5 and parts[:3] == ("terminal", "opencode", "skills")
        )
        if not path.endswith("/SKILL.md") or not (direct or path in VENDORED):
            continue
        text = subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=ROOT).decode()
        metadata = yaml.safe_load(text.split("---", 2)[1])
        name = metadata["name"]
        if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
            raise ValueError(f"Invalid skill name in {revision}:{path}")
        if not isinstance(metadata.get("description"), str) or not metadata["description"].strip():
            raise ValueError(f"Missing description in {revision}:{path}")
        if name in skills:
            raise ValueError(f"Duplicate skill name {name}: {skills[name]} and {path}")
        skills[name] = str(PurePosixPath(path).parent)
    if not skills:
        raise ValueError("No skills found in revision")
    return dict(sorted(skills.items()))


def native_case(entry, catalog):
    skill = entry["skill"]
    eval_root = catalog[skill] / "evals"
    source = eval_root / "cases" / f"{entry['case']}.yaml"
    case = yaml.safe_load(source.read_text())
    if case["schema_version"] != 2 or "turns" in case:
        raise ValueError(f"Unsupported case format: {source}")
    task_id = f"expanded-{skill}-{entry['case']}"
    files = []
    setup = []
    if set(case.get("setup", {})) - {"fixtures"}:
        raise ValueError(f"Unsupported setup: {source}")
    for target, relative in case.get("setup", {}).get("fixtures", {}).items():
        target_path = PurePosixPath(target)
        if target_path.is_absolute() or ".." in target_path.parts:
            raise ValueError(f"Unsafe fixture destination: {target}")
        fixture = (eval_root / relative).resolve()
        if not fixture.is_relative_to(eval_root.resolve()) or not fixture.is_file():
            raise ValueError(f"Missing or escaping fixture: {fixture}")
        relative_copy = f"expanded/{skill}/{relative}"
        files.append((fixture, relative_copy))
        source_expr = '"$SKILL_EVALS_ROOT"/' + shlex.quote(relative_copy)
        setup.append(
            {
                "command": f"mkdir -p {shlex.quote(str(target_path.parent))} && "
                f"cp {source_expr} {shlex.quote(target)}"
            }
        )
    checks = []
    for index, check in enumerate(case["checks"]):
        description = f"outcome:{skill}:{index}"
        if check["kind"] == "file_exists":
            checks.append(
                {"type": "file_exists", "path": check["path"], "description": description}
            )
        elif check["kind"] == "shell" and check.get("unsafe_shell") is True:
            if set(check) - {"kind", "cmd", "unsafe_shell", "expect_exact"}:
                raise ValueError(f"Unsupported shell-check fields: {source}")
            checks.append(
                {
                    "type": "run_command",
                    "description": description,
                    "command": check["cmd"],
                    "expected_stdout": check["expect_exact"],
                    "stdout_match": "exact",
                    "timeout": 30,
                }
            )
        else:
            raise ValueError(f"Unsupported check kind {check['kind']}: {source}")
    checks.append(
        {
            "type": "skill_triggered",
            "description": f"activation:{skill}",
            "skill_name": skill,
            "expected_skill": skill,
            "weight": 0,
        }
    )
    task = {
        "task_id": task_id,
        "description": case["description"],
        "initial_prompt": case["prompt"],
        "tags": ["behavior", skill, entry["kind"]],
        "pre_run": setup,
        "success_criteria": checks,
    }
    if entry["manual_review"]:
        task["tags"].append("manual-review")
    validate_task(task)
    return task, files, source


def make_study(catalogs, suite, profile, case_catalog=None):
    entries = load_json(HERE / "expanded_cases.json")
    source_catalog = case_catalog if case_catalog is not None else catalogs["on"]
    imported = [native_case(entry, source_catalog) for entry in entries]
    tasks = base_tasks() + [task for task, _, _ in imported]
    targets = {
        task["task_id"]: next(name for name in catalogs["on"] if name in task["tags"])
        for task in tasks
    }
    names = sorted(set().union(*(set(c) for c in catalogs.values())))
    files = [item for _, copies, _ in imported for item in copies]
    provenance = [
        {
            "skill": entry["skill"],
            "case": entry["case"],
            "kind": entry["kind"],
            "manual_review": entry["manual_review"],
            "source": str(source),
            "task": task["task_id"],
            "case_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        }
        for entry, (task, _, source) in zip(entries, imported, strict=True)
    ]
    labels = load_json(HERE / "routing.json") + load_json(HERE / "expanded_routing.json")
    if suite == "routing":
        fixtures = {task["task_id"]: task for task in tasks}
        route_tasks = []
        for row in labels:
            if not set(row["required"]) <= set(row["allowed"]) <= set(names):
                raise ValueError(f"Invalid routing labels: {row['id']}")
            route_tasks.append(
                {
                    "task_id": "route-" + row["id"],
                    "description": row["prompt"],
                    "initial_prompt": row["prompt"],
                    "tags": ["routing"],
                    "pre_run": fixtures[row["fixture"]]["pre_run"] if row.get("fixture") else [],
                    "success_criteria": [
                        {
                            "type": "skill_triggered",
                            "weight": 0,
                            "description": f"routing:{name}",
                            "skill_name": name,
                            "expected_skill": name if name in row["required"] else "",
                        }
                        for name in names
                        if name not in set(row["allowed"]) - set(row["required"])
                    ],
                }
            )
        tasks = route_tasks
    if len({task["task_id"] for task in tasks}) != len(tasks):
        raise ValueError("Duplicate expanded task ids")
    for task in tasks:
        validate_task(task)
    supports = {entry["skill"]: [entry["skill"], *entry["support"]] for entry in entries}
    supports.update({"code-review": list(CATALOG), "simplify": list(CATALOG)})
    return {
        "tasks": tasks,
        "targets": targets,
        "files": files,
        "routing_labels": labels,
        "profile": profile,
        "supports": supports,
        "imports": provenance,
        "manual_review_tasks": [
            task["task_id"] for task in tasks if "manual-review" in task["tags"]
        ],
        "catalog_names": names,
        "behavior_skills": sorted(set(targets.values())),
    }


def write_coverage(directory, catalogs, study):
    manifest = load_json(directory / "manifest.json")
    task_ids = {row["task"] for row in manifest["expected"]}
    behavior = {study["targets"][task] for task in task_ids if task in study["targets"]}
    positive = {
        skill
        for row in study["routing_labels"]
        if "route-" + row["id"] in task_ids
        for skill in row["required"]
    }
    coverage = {}
    for variant, catalog in catalogs.items():
        groups = {
            key.split("/")[0]: sorted(hashes)
            for key, hashes in manifest["bundles"].items()
            if key.endswith("/" + variant)
        }
        available = set().union(*(set(names) for names in groups.values()))
        coverage[variant] = {
            "discovered": sorted(catalog),
            "available": sorted(available),
            "available_by_group": groups,
            "behavioral_cases": sorted(behavior & available),
            "positive_routing_cases": sorted(positive & available),
            "defined_behavior_skills": study["behavior_skills"],
            "integration_coverage": [],
            "no_behavioral_cases": sorted(catalog.keys() - behavior),
        }
    (directory / "coverage.json").write_text(json.dumps(coverage, indent=2) + "\n")
