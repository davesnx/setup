"""Local process fixture for trigger evaluator tests. Never calls a model."""

import json
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path


query = sys.argv[sys.argv.index("-p") + 1]
context = Path.cwd()
commands = list((context / ".claude" / "skills").glob("*/SKILL.md"))
assert len(commands) == 1, commands
assert "CLAUDECODE" not in os.environ
command = commands[0]
candidate = command.parent.name
settings = json.loads(sys.argv[sys.argv.index("--settings") + 1])
guard = settings["hooks"]["PreToolUse"][0]["hooks"][0]["command"]
assert sys.argv[sys.argv.index("--tools") + 1] == "Skill"
assert sys.argv[sys.argv.index("--permission-mode") + 1] == "dontAsk"
assert "--strict-mcp-config" in sys.argv
assert "Do not perform the user task" in command.read_text()
log_dir = Path(os.environ["FAKE_CLAUDE_LOG"])
(log_dir / f"{context.name}.json").write_text(json.dumps({
    "cwd": str(context), "commands": [str(p) for p in commands], "argv": sys.argv[1:],
    "home": os.environ.get("HOME"), "config_dir": os.environ.get("CLAUDE_CONFIG_DIR"),
}))

if query.startswith("concurrent"):
    deadline = time.monotonic() + 5
    while len(list(log_dir.glob("*.json"))) < 2:
        assert time.monotonic() < deadline, "second process did not start"
        time.sleep(0.01)


def emit(event):
    print(json.dumps(event), flush=True)


def assistant(*blocks):
    emit({"type": "assistant", "message": {"content": list(blocks)}})


def tool(name, **tool_input):
    return {"type": "tool_use", "name": name, "input": tool_input}


if query != "no-init":
    emit({"type": "system", "subtype": "init", "skills":
          [candidate, "installed-original"] if query.startswith("contaminated") else
          [] if query == "missing-candidate" else [candidate],
          "tools": ["Skill", "Bash"] if query == "extra-tools" else ["Skill"],
          "mcp_servers": [{"name": "outside"}] if query == "extra-mcp" else []})
assistant({"type": "text", "text": "Checking the request."})
if query == "read":
    assistant(tool("Read", file_path=str(command)))
elif query == "similar-name":
    assistant(tool("Skill", skill=candidate + "-other"))
elif query == "similar-path":
    assistant(tool("Read", file_path=str(command) + ".other"))
elif query == "outside-search":
    assistant(tool("Bash", command="find / -name SKILL.md"))
elif query == "substitute":
    request = {"tool_name": "Skill", "tool_input": {"skill": "installed-original"}}
    blocked = subprocess.run(shlex.split(guard), input=json.dumps(request), text=True, capture_output=True)
    assert blocked.returncode == 2, blocked
    assistant(tool("Skill", skill="installed-original"))
    emit({"type": "user", "message": {"content": [{"type": "tool_result", "is_error": True}]}})
elif query not in ("negative", "contaminated-negative", "missing-result", "malformed", "tool-error-negative"):
    assistant(tool("Skill", skill=candidate))
    approved = subprocess.run(shlex.split(guard), input=json.dumps({"tool_name": "Skill", "tool_input": {"skill": candidate}}), text=True, capture_output=True)
    assert approved.returncode == 0, approved
    assert approved.stdout == "", "Guard must not override other hooks with an allow decision"
    if query != "missing-receipt":
        emit({"type": "user", "message": {"content": [{"type": "tool_result", "content": "Launching skill"}]},
              "tool_use_result": {"success": True, "commandName": candidate}})

if query == "timeout":
    time.sleep(60)
if query == "missing-result":
    sys.exit(0)
if query == "malformed":
    print("not json")
if query in ("tool-error", "tool-error-negative"):
    emit({"type": "user", "message": {"content": [{"type": "tool_result", "is_error": True}]}})
if query == "assistant-error":
    emit({"type": "assistant", "error": "authentication_failed"})
if query == "buffered":
    # Exceed both pipe buffers to exercise communicate(), not just a short read.
    emit({"type": "system", "padding": "x" * 100000})
    print("diagnostic " * 10000, file=sys.stderr)

result = {"type": "result", "subtype": "success", "is_error": False}
if query == "result-error":
    result.update(subtype="error_during_execution", is_error=True)
if query == "turn-limit":
    result.update(subtype="error_max_turns")
if query == "permission-denied":
    result["permission_denials"] = [{"tool_name": "Skill"}]
sys.stdout.write(json.dumps(result))
sys.stdout.flush()
sys.exit(7 if query == "exit-error" else 0)
