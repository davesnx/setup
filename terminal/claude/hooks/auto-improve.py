#!/usr/bin/env python3

import fcntl
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile


REVIEW = (
    "Load the auto-improve skill for this automatic, one-per-session checkpoint. "
    "Inspect the current session and relevant setup files read-only. Show at most "
    "3 concrete, evidence-backed proposals for skills, hooks, scripts, or rules, "
    "and ask which to apply. Make no setup or code edits, commits, or external "
    "calls to publish. If no proposal is useful, finish quietly. Do not issue "
    "another automatic review in this session."
)


def valid_state(state):
    if not isinstance(state, dict) or set(state) != {
        "current_prompt_id", "completed_prompt_ids", "issued"
    }:
        return False
    completed = state["completed_prompt_ids"]
    current = state["current_prompt_id"]
    if not isinstance(completed, list) or len(completed) > 3:
        return False
    ids = completed + ([] if current is None else [current])
    return (
        all(
            isinstance(value, str)
            and len(value) == 64
            and all(char in "0123456789abcdef" for char in value)
            for value in ids
        )
        and len(set(ids)) == len(ids)
        and type(state["issued"]) is bool
        and state["issued"] == (len(completed) == 3)
        and (not state["issued"] or current is None)
    )


def main():
    phase = "input"
    try:
        event = json.load(sys.stdin)
        if not isinstance(event, dict):
            raise ValueError("invalid event")
        name = event.get("hook_event_name")
        if name not in ("UserPromptSubmit", "Stop") or "agent_id" in event:
            return
        session_id = event.get("session_id")
        prompt_id = event.get("prompt_id")
        if not session_id or not prompt_id:
            return
        if not isinstance(session_id, str) or not isinstance(prompt_id, str):
            raise ValueError("invalid IDs")
        active = event.get("stop_hook_active", False)
        if type(active) is not bool:
            raise ValueError("invalid continuation flag")
        if active:
            return

        phase = "state"
        os.umask(0o077)
        root = Path(os.environ.get("XDG_STATE_HOME") or Path.home() / ".local/state")
        if not root.is_absolute():
            raise ValueError("state root must be absolute")
        directory = root / "auto-improve/claude"
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        session_key = hashlib.sha256(session_id.encode()).hexdigest()
        prompt_key = hashlib.sha256(prompt_id.encode()).hexdigest()
        state_path = directory / (session_key + ".json")
        with (directory / (session_key + ".lock")).open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if state_path.exists() or state_path.is_symlink():
                with state_path.open() as source:
                    state = json.load(source)
                if not valid_state(state):
                    raise ValueError("invalid state")
            else:
                if name == "Stop":
                    return
                state = {
                    "current_prompt_id": None,
                    "completed_prompt_ids": [],
                    "issued": False,
                }
            if state["issued"] or prompt_key in state["completed_prompt_ids"]:
                return
            if name == "UserPromptSubmit":
                if state["current_prompt_id"] == prompt_key:
                    return
                state["current_prompt_id"] = prompt_key
            else:
                if state["current_prompt_id"] != prompt_key:
                    return
                state["current_prompt_id"] = None
                state["completed_prompt_ids"].append(prompt_key)
                state["issued"] = len(state["completed_prompt_ids"]) == 3

            temporary = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", dir=directory, prefix=session_key + ".",
                    suffix=".tmp", delete=False,
                ) as target:
                    temporary = Path(target.name)
                    json.dump(state, target)
                    target.flush()
                    os.fsync(target.fileno())
                os.replace(temporary, state_path)
                directory_fd = os.open(directory, os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)

            # Persist first: a crash before output may skip a review, never repeat it.
            if state["issued"]:
                phase = "output"
                print(json.dumps({"hookSpecificOutput": {
                    "hookEventName": "Stop", "additionalContext": REVIEW,
                }}), flush=True)
    except (OSError, ValueError, RuntimeError) as error:
        print(
            f"auto-improve: {phase} failed ({type(error).__name__}); no review.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
