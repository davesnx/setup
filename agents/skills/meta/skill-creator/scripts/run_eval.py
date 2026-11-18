#!/usr/bin/env python3
"""Evaluate description triggers with Claude Code only, not the host model.

Each attempt uses a native candidate skill and selection-only instructions.
Only Skill is available, with a hook that rejects other skill names. A score
requires a candidate-only advertised catalog and successful completion. Profiles
with other advertised skills are unsupported, not measured misses. Authentication
and existing hooks remain in place; no credentials or user settings are copied.
"""

import argparse
import json
import os
import shlex
import subprocess
import sys
import tempfile
import uuid
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from scripts.utils import parse_skill_md, validate_claude_model


def run_single_query(
    query: str,
    skill_name: str,
    skill_description: str,
    timeout: int,
    model: str | None = None,
) -> bool:
    """Return a trigger only after successful completion; raise on runner errors."""
    validate_claude_model(model)
    if not skill_name or Path(skill_name).name != skill_name:
        raise ValueError("Skill name must be a single filename component")
    clean_name = f"{skill_name}-skill-{uuid.uuid4().hex[:8]}"
    with tempfile.TemporaryDirectory(prefix="skill-trigger-") as context:
        command_file = Path(context) / ".claude" / "skills" / clean_name / "SKILL.md"
        command_file.parent.mkdir(parents=True)
        indented_desc = "\n  ".join(skill_description.split("\n"))
        command_file.write_text(
            f"---\nname: {clean_name}\ndescription: |\n  {indented_desc}\n---\n\n"
            "Selection is complete. Reply SELECTED and stop. This is a description-only "
            "selection test, not the full skill. Do not perform the user task, "
            "load another skill, or search for files.\n"
        )
        settings = {
            "disableBundledSkills": True,
            "disableSkillShellExecution": True,
            "skillOverrides": {"doctor": "off"},
            "hooks": {"PreToolUse": [{
                "matcher": "*",
                "hooks": [{"type": "command", "command": shlex.join([
                    sys.executable, str(Path(__file__).with_name("selection_guard.py").resolve()),
                    clean_name,
                ])}],
            }]},
        }
        cmd = [
            "claude", "-p", query, "--output-format", "stream-json", "--verbose",
            "--tools", "Skill", "--allowedTools", f"Skill({clean_name})",
            "--permission-mode", "dontAsk", "--strict-mcp-config",
            "--mcp-config", '{"mcpServers":{}}', "--disallowedTools", "mcp__*",
            "--no-session-persistence", "--include-hook-events", "--settings", json.dumps(settings),
            "--append-system-prompt",
            "This session measures skill selection only. Decide whether an available "
            "skill is relevant to the user request. If relevant, invoke it with Skill. "
            "Otherwise reply NO_SKILL. Do not perform the requested task. After a skill "
            "returns, follow its completion instruction and stop. Do not search for other skills.",
        ]
        if model:
            cmd.extend(["--model", model])
        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

        # communicate() drains both pipes and waits for exit, including buffered
        # events after the last tool. Partial events are not needed for scoring.
        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=context, env=env, timeout=timeout,
        )
        if result.returncode != 0:
            raise RuntimeError(f"claude -p exited {result.returncode}")

        triggered = False
        loaded = False
        isolated = False
        completed = False
        for line in result.stdout.splitlines():
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError as error:
                raise RuntimeError("Invalid Claude JSON transcript") from error
            if not isinstance(event, dict):
                raise RuntimeError("Invalid Claude transcript event")
            if event.get("error") or event.get("type") == "error":
                raise RuntimeError("Claude reported an error")
            if event.get("type") == "system" and event.get("subtype") == "init":
                if event.get("skills") != [clean_name]:
                    raise RuntimeError(
                        "Unsupported Claude catalog: expected only the evaluation candidate; "
                        "installed, plugin, managed, or missing skills prevent isolated comparison"
                    )
                tools = event.get("tools", [])
                if "Skill" not in tools or set(tools) - {"Skill", "EndConversation"} or event.get("mcp_servers") != []:
                    raise RuntimeError("Unsupported Claude tool catalog for selection-only evaluation")
                isolated = True
            elif event.get("type") in ("assistant", "user"):
                receipt = event.get("tool_use_result", {})
                if receipt.get("success") and receipt.get("commandName") == clean_name:
                    loaded = True
                for block in event.get("message", {}).get("content", []):
                    if not isinstance(block, dict):
                        continue
                    if block.get("type") == "tool_result" and block.get("is_error"):
                        raise RuntimeError("Claude tool execution failed")
                    if block.get("type") != "tool_use":
                        continue
                    tool_input = block.get("input", {})
                    if block.get("name") == "EndConversation":
                        continue
                    if block.get("name") != "Skill" or tool_input.get("skill") != clean_name:
                        raise RuntimeError("Claude attempted an action outside candidate selection")
                    triggered = True
            elif event.get("type") == "result":
                if event.get("is_error") or event.get("subtype") != "success":
                    raise RuntimeError("Claude did not complete successfully")
                if event.get("permission_denials"):
                    raise RuntimeError("Claude tool permission denied")
                completed = True
        if not completed:
            raise RuntimeError("Claude transcript has no successful completion")
        if not isolated:
            raise RuntimeError("Claude transcript has no candidate-only catalog evidence")
        if triggered != loaded:
            raise RuntimeError("Claude candidate invocation has no matching successful load")
        return triggered


def run_eval(
    eval_set: list[dict],
    skill_name: str,
    description: str,
    num_workers: int,
    timeout: int,
    runs_per_query: int = 1,
    trigger_threshold: float = 0.5,
    model: str | None = None,
) -> dict:
    """Score completed Claude attempts. Runner errors abort without a score."""
    validate_claude_model(model)
    if not eval_set or len({item["query"] for item in eval_set}) != len(eval_set):
        raise ValueError("Evaluation queries must be nonempty and unique")
    if num_workers < 1 or runs_per_query < 1 or timeout <= 0:
        raise ValueError("Workers, runs per query, and timeout must be positive")
    if not 0 < trigger_threshold <= 1:
        raise ValueError("Trigger threshold must be greater than 0 and at most 1")
    query_triggers: dict[str, list[bool]] = {item["query"]: [] for item in eval_set}
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        future_to_query = {}
        for item in eval_set:
            for _ in range(runs_per_query):
                future = executor.submit(
                    run_single_query, item["query"], skill_name, description, timeout, model,
                )
                future_to_query[future] = item["query"]
        for future in as_completed(future_to_query):
            try:
                query_triggers[future_to_query[future]].append(future.result())
            except Exception as error:
                for pending in future_to_query:
                    pending.cancel()
                raise RuntimeError("Claude evaluation failed; no scores produced") from error

    results = []
    for item in eval_set:
        triggers = query_triggers[item["query"]]
        trigger_rate = sum(triggers) / len(triggers)
        should_trigger = item["should_trigger"]
        did_pass = trigger_rate >= trigger_threshold if should_trigger else trigger_rate < trigger_threshold
        results.append({
            "query": item["query"],
            "should_trigger": should_trigger,
            "trigger_rate": trigger_rate,
            "triggers": sum(triggers),
            "runs": len(triggers),
            "pass": did_pass,
        })
    passed = sum(1 for r in results if r["pass"])
    return {
        "runner": "claude",
        "measurement": "isolated-description-selection",
        "model": model,
        "skill_name": skill_name,
        "description": description,
        "results": results,
        "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON file")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--description", default=None, help="Override description to test")
    parser.add_argument("--num-workers", type=int, default=10, help="Number of parallel workers")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout per query in seconds")
    parser.add_argument("--runs-per-query", type=int, default=3, help="Number of runs per query")
    parser.add_argument("--trigger-threshold", type=float, default=0.5, help="Trigger rate threshold")
    parser.add_argument("--model", default=None, help="Claude model ID or alias (default: Claude CLI configuration, not host model)")
    parser.add_argument("--verbose", action="store_true", help="Print progress to stderr")
    args = parser.parse_args()
    validate_claude_model(args.model)

    eval_set = json.loads(Path(args.eval_set).read_text())
    skill_path = Path(args.skill_path)
    if not (skill_path / "SKILL.md").exists():
        parser.error(f"No SKILL.md found at {skill_path}")
    name, original_description, _ = parse_skill_md(skill_path)
    description = args.description or original_description
    output = run_eval(
        eval_set=eval_set, skill_name=name, description=description,
        num_workers=args.num_workers, timeout=args.timeout,
        runs_per_query=args.runs_per_query, trigger_threshold=args.trigger_threshold,
        model=args.model,
    )
    if args.verbose:
        summary = output["summary"]
        print(f"Results: {summary['passed']}/{summary['total']} passed", file=sys.stderr)
        for r in output["results"]:
            status = "PASS" if r["pass"] else "FAIL"
            print(f"  [{status}] rate={r['triggers']}/{r['runs']} expected={r['should_trigger']}: {r['query'][:70]}", file=sys.stderr)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
