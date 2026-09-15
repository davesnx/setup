#!/usr/bin/env python3
"""Check Ghostty's editing signals through a temporary, unfocused Herdr pane.

Run from inside Herdr. Uses a mock clipboard; leaves the desktop clipboard alone.
The API exercises Herdr's pane encoder, not Ghostty's GUI or the client parser.
"""

import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile
import time

from selection import ROOT, SCRIPT, ZIM_HOME


def herdr(*args):
    return subprocess.run(["herdr", *args], check=True, capture_output=True, text=True).stdout


def main():
    if os.environ.get("HERDR_ENV") != "1":
        raise SystemExit("Run this integration test from a Herdr pane.")

    config = (ROOT / "mac/ghostty/config.conf").read_text()
    copy = re.search(r"keybind = cmd\+c=copy_to_clipboard\s+keybind = chain=csi:([^\n]+)", config)
    cut = re.search(r"keybind = cmd\+x=csi:([^\n]+)", config)
    assert copy and cut, "Could not find the Ghostty clipboard bindings"
    assert r"keybind = cmd+z=text:\x1f" in config, "Cmd+Z must send zsh's undo key"
    # Include the old signals so reverting to them reproduces the dropped input.
    keys = {"25~": "f13", "26~": "f14", "1;2P": "shift+f1", "1;2Q": "shift+f2"}
    copy_key, cut_key = keys[copy[1]], keys[cut[1]]

    layout = json.loads(herdr("pane", "layout", "--pane", os.environ["HERDR_PANE_ID"]))["result"]["layout"]
    area = next(p["rect"] for p in layout["panes"] if p["pane_id"] == os.environ["HERDR_PANE_ID"])
    direction = "right" if area["width"] > 2 * area["height"] else "down"

    with tempfile.TemporaryDirectory(prefix="selection-herdr-") as work:
        state_path = Path(work) / "state"
        fixture = Path(work) / "fixture.zsh"
        fixture.write_text(SCRIPT)
        pane = json.loads(herdr("pane", "split", "--current", "--direction", direction,
                               "--cwd", str(ROOT), "--no-focus"))["result"]["pane"]["pane_id"]
        try:
            env = {
                "SELECTION_ROOT": str(ROOT), "ZIM_HOME": str(ZIM_HOME),
                "SELECTION_STATE": str(state_path), "SELECTION_BUFFER": "hello world",
                "SELECTION_CURSOR": "11", "SELECTION_CLIPBOARD_FAIL": "0",
            }
            command = " ".join(f"{key}={shlex.quote(value)}" for key, value in env.items())
            herdr("pane", "run", pane, f"{command} /bin/zsh -fi {shlex.quote(str(fixture))}")

            def expect(expected):
                deadline = time.monotonic() + 10
                seen = None
                while time.monotonic() < deadline:
                    if state_path.exists():
                        seen = state_path.read_bytes().decode().split("\0")[:6]
                        if seen == expected:
                            return
                    time.sleep(0.02)
                raise AssertionError(f"Herdr state: {seen!r}; expected {expected!r}")

            def send(*key_names):
                herdr("pane", "send-keys", pane, *key_names, "ctrl+x", "ctrl+t")

            expect(["hello world", "11", "0", "0", "main", "unchanged"])
            send("alt+shift+left")
            expect(["hello world", "6", "11", "1", "shift-select", "unchanged"])
            send(copy_key)
            expect(["hello world", "6", "11", "1", "shift-select", "world"])
            print("PASS: configured copy key reaches ZLE through Herdr")
            send(cut_key)
            expect(["hello ", "6", "6", "0", "main", "world"])
            print("PASS: configured cut key reaches ZLE through Herdr")
            send("ctrl+/")
            expect(["hello world", "6", "6", "0", "main", "world"])
            print("PASS: configured undo key restores the cut through Herdr")
        finally:
            herdr("pane", "close", pane)


if __name__ == "__main__":
    main()
