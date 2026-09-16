"""Report task outcomes separately from successful skill-tool activations."""

import hashlib
import json
from collections import Counter, defaultdict
from statistics import mean


def activations(result):
    return {
        command["parameters"]["skill"]
        for turn in result["iterations"]
        for command in turn["commands"]
        if command["tool_name"] == "Skill"
        and command["result_status"] == "success"
        and isinstance(command["parameters"].get("skill"), str)
    }


def routing_counts(rows, labels, catalog):
    counts = {name: Counter(tp=0, fp=0, fn=0, tn=0) for name in catalog}
    for row in rows:
        label = labels[row["task"]]
        for name in catalog:
            if name in label["allowed"] and name not in label["required"]:
                continue  # Optional supporting skills are neither required nor forbidden.
            expected = name in label["required"]
            observed = name in row["activated"]
            counts[name][("t" if expected == observed else "f") + ("p" if observed else "n")] += 1
    return {
        name: {
            **count,
            "precision": count["tp"] / (count["tp"] + count["fp"])
            if count["tp"] + count["fp"]
            else None,
            "recall": count["tp"] / (count["tp"] + count["fn"])
            if count["tp"] + count["fn"]
            else None,
        }
        for name, count in counts.items()
    }


def summarize(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    baseline = manifest.get("baseline_variant", "absent")
    labels = {
        "route-" + row["id"]: row
        for row in json.loads((directory / "routing-labels.json").read_text())
    }
    expected = {(r["group"], r["variant"], r["task"]): r["repeats"] for r in manifest["expected"]}
    observed = Counter()
    rows = []
    errors = []
    if not expected:
        raise ValueError("No planned attempts in manifest")
    for file, digest in manifest.get("grader_hashes", {}).items():
        if hashlib.sha256((directory / file).read_bytes()).hexdigest() != digest:
            errors.append(f"Grader evidence changed: {file}")
    for path in sorted((directory / "results").rglob("task.json")):
        relative = path.relative_to(directory / "results")
        if "artifacts" in relative.parts:
            continue
        result = json.loads(path.read_text())
        key = (relative.parts[0], result["variant_id"], result["task_id"])
        observed[key] += 1
        status = result["final_status"]
        criteria = result["success_criteria_results"]
        complete = status in {"SUCCESS", "FAILURE"} and not result["max_turns_exhausted"]
        if any(c.get("error") or c.get("evaluation_status") != "evaluated" for c in criteria):
            complete = False
            errors.append(f"{path}: checker error or unevaluated criterion")
        if not complete:
            errors.append(f"{path}: incomplete execution ({status})")
        activated = sorted(activations(result))
        if key[1] == "absent" and key[0] in activated:
            errors.append(f"{path}: absent target skill was activated")
        row = {
            "group": key[0],
            "variant": key[1],
            "task": key[2],
            "status": status,
            "complete": complete,
            "activated": activated,
            "duration_seconds": result["duration_seconds"],
            "tokens": result["total_token_usage"],
            "evidence": str(path),
            "artifacts": result.get("sandbox_path"),
            "quality": [c for c in criteria if c["description"].startswith("quality:")],
        }
        if manifest["suite"] == "routing":
            label = labels[key[2]]
            row["passed"] = complete and set(label["required"]) <= set(activated) <= set(
                label["allowed"]
            )
        else:
            outcomes = [c for c in criteria if c["description"].startswith("outcome:")]
            if not outcomes and complete:
                errors.append(f"{path}: no outcome checks")
            row["passed"] = (
                complete
                and bool(outcomes)
                and all(
                    c["evaluation_status"] == "evaluated" and c["score"] >= c["pass_threshold"]
                    for c in outcomes
                )
            )
            needs_review = key[2] in manifest.get("manual_review_tasks", [])
            row["manual_review"] = (
                "PENDING" if needs_review or key[2].startswith("simplify-readonly") else None
            )
        rows.append(row)
    for key in expected.keys() | observed.keys():
        if observed[key] != expected.get(key, 0):
            errors.append(f"Coverage {key}: expected {expected.get(key, 0)}, got {observed[key]}")
    audits = [json.loads(p.read_text()) for p in (directory / "audit").glob("*.json")]
    if len(audits) != sum(expected.values()) or not all(a["catalog_verified"] for a in audits):
        errors.append("Skill-catalog audit missing or failed; this comparison is not valid")
    if not audits or not all(a.get("configuration_verified", False) for a in audits):
        errors.append("Effective-configuration audit missing or failed; rerun with isolation v2")
    cells = defaultdict(list)
    for row in rows:
        cells[(row["group"], row["variant"], row["task"])].append(row)
    scores = [
        {
            "group": group,
            "variant": variant,
            "task": task,
            "passed": sum(r["passed"] for r in samples),
            "attempts": len(samples),
            "pass_rate": mean(r["passed"] for r in samples),
            "mean_seconds": mean(r["duration_seconds"] for r in samples),
        }
        for (group, variant, task), samples in sorted(cells.items())
    ]
    deltas = []
    if not errors and manifest["suite"] == "behavior":
        by_key = {(s["group"], s["variant"], s["task"]): s for s in scores}
        for score in scores:
            if score["variant"] == baseline:
                continue
            control = by_key[(score["group"], baseline, score["task"])]
            deltas.append(
                {
                    "task": score["task"],
                    "variant": score["variant"],
                    "delta_pp": 100 * (score["pass_rate"] - control["pass_rate"]),
                }
            )
    routing_by_variant = (
        {
            variant: routing_counts(
                [r for r in rows if r["complete"] and r["variant"] == variant],
                labels,
                manifest["catalog"],
            )
            for variant in sorted({r["variant"] for r in rows})
        }
        if manifest["suite"] == "routing"
        else {}
    )
    pending_reviews = [
        {key: row[key] for key in ["group", "variant", "task", "evidence", "artifacts"]}
        for row in rows
        if row.get("manual_review") == "PENDING" and row["passed"]
    ]
    automatic_pass = not errors and all(row["passed"] for row in rows)
    assessment = (
        "invalid"
        if errors
        else "automatic_checks_failed"
        if not automatic_pass
        else "needs_review"
        if pending_reviews
        else "passed"
    )
    output = {
        "valid_comparison": not errors,
        "automatic_checks_passed": automatic_pass,
        "assessment_status": assessment,
        "pending_reviews": pending_reviews,
        "comparison": manifest.get("comparison"),
        "profile": manifest.get("profile", "pilot"),
        "errors": errors,
        "scores": scores,
        "deltas": deltas,
        "rows": rows,
        "routing": next(iter(routing_by_variant.values()))
        if len(routing_by_variant) == 1
        else None,
        "routing_by_variant": routing_by_variant,
    }
    (directory / "summary.json").write_text(json.dumps(output, indent=2) + "\n")
    lines = [
        "# Skill evaluation pilot",
        "",
        f"Model: `{manifest['model']}`; OpenCode: `{manifest['opencode']}`; "
        f"Coder Eval: `{manifest['coder_eval']}`.",
        "",
        "Comparison evidence: **" + ("complete" if not errors else "INVALID / INCOMPLETE") + "**",
        "",
        f"Assessment: **{assessment}**. Automatic checks and qualitative review are separate.",
        "",
        "| Task | Variant | Passed / attempts | Mean seconds |",
        "| --- | --- | --- | --- |",
    ]
    lines += [
        f"| {s['task']} | {s['variant']} | {s['passed']}/{s['attempts']} | "
        f"{s['mean_seconds']:.1f} |"
        for s in scores
    ]
    lines += ["", f"## Outcome deltas against {baseline}", ""]
    lines += [
        f"- {d['task']} / {d['variant']}: {d['delta_pp']:+.1f} percentage points." for d in deltas
    ] or ["No valid paired outcome deltas."]
    if routing_by_variant:
        lines += ["", "## Routing", "", "Optional skill activations are excluded from P/R.", ""]
        for variant, counts in routing_by_variant.items():
            lines += [f"### {variant}", ""]
            for name, stats in counts.items():
                lines.append(f"- {name}: {json.dumps(stats)}")
    if pending_reviews:
        lines += [
            "",
            "## Pending qualitative review",
            "",
            "Check relevance, source support, attribution, and omitted claims in these outputs:",
            "",
        ]
        lines += [
            f"- {r['variant']} / {r['task']}: `{r['artifacts'] or r['evidence']}`"
            for r in pending_reviews
        ]
    lines += ["", "## Execution issues", "", *[f"- {e}" for e in errors]]
    if manifest["suite"] == "behavior":
        lines += [
            "",
            "## Target activation (not an outcome score)",
            "",
            "| Task | Variant | Activated / attempts |",
            "| --- | --- | --- |",
        ]
        for (group, variant, task), samples in sorted(cells.items()):
            count = sum(group in r["activated"] for r in samples)
            lines.append(f"| {task} | {variant} | {count}/{len(samples)} |")
    lines += [
        "",
        "## Review and scope",
        "",
        "Read-only simplification outputs require human review for correct, useful findings.",
        "Complexity checks are advisory proxies; inspect the diff for readability.",
        "Repetitions measure observed consistency, not statistical confidence.",
        f"Catalog profile: {manifest.get('profile', 'pilot')}; "
        f"{len(manifest['catalog'])} names across the catalogs, including built-ins.",
        "See the manifest and coverage.json, when present, for per-revision coverage.",
        f"Recorded structural link warnings: {len(manifest.get('structural_link_warnings', []))}.",
        "Per-attempt tokens, activation, quality, and evidence paths are in summary.json.",
    ]
    (directory / "summary.md").write_text("\n".join(lines) + "\n")
    print(f"Report: {directory / 'summary.md'}")
    return 2 if errors else int(any(not row["passed"] for row in rows))
