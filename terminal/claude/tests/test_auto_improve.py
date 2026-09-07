import concurrent.futures
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[3]
HOOK = ROOT / "terminal/claude/hooks/auto-improve.py"


class ClaudeAutoImproveTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="auto-improve-test-")
        self.addCleanup(self.temporary.cleanup)
        self.home = Path(self.temporary.name) / "home with spaces"
        self.home.mkdir()
        self.state_root = self.home / "state"
        self.directory = self.state_root / "auto-improve/claude"
        self.env = dict(os.environ, HOME=str(self.home),
                        XDG_STATE_HOME=str(self.state_root))

    def event(self, name, prompt_id="p1", session="session", **fields):
        return dict(hook_event_name=name, session_id=session, prompt_id=prompt_id,
                    stop_hook_active=False, **fields)

    def invoke(self, event, command=None):
        return subprocess.run(
            command or [sys.executable, str(HOOK)],
            input=event if isinstance(event, str) else json.dumps(event),
            text=True, capture_output=True, env=self.env, cwd=self.home, timeout=5,
        )

    def quiet(self, event):
        result = self.invoke(event)
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, "", ""))

    def failed_closed(self, result):
        self.assertEqual((result.returncode, result.stdout), (0, ""))
        self.assertIn("auto-improve:", result.stderr)
        self.assertNotIn("SECRET", result.stderr)

    def complete(self, prompt, session="session"):
        self.quiet(self.event("UserPromptSubmit", prompt, session))
        result = self.invoke(self.event("Stop", prompt, session))
        self.assertEqual((result.returncode, result.stderr), (0, ""))
        return result.stdout

    def state_path(self, session="session"):
        return self.directory / (hashlib.sha256(session.encode()).hexdigest() + ".json")

    def state(self):
        return json.loads(self.state_path().read_text())

    def assert_review(self, output):
        response = json.loads(output)
        self.assertEqual(set(response), {"hookSpecificOutput"})
        specific = response["hookSpecificOutput"]
        self.assertEqual(set(specific), {"hookEventName", "additionalContext"})
        self.assertEqual(specific["hookEventName"], "Stop")
        for text in ("auto-improve", "one-per-session", "Do not run the review in this",
                     "background fork", "end the turn", "read-only", "at most 3",
                     "evidence-backed", "ask which to apply", "Make no setup or code edits",
                     "commits", "external calls to publish", "finish quietly",
                     "Do not issue another automatic review"):
            self.assertIn(text, specific["additionalContext"])

    def test_three_completions_and_continuation(self):
        self.assertEqual(self.complete("p1"), "")
        self.assertEqual(self.complete("p2"), "")
        self.assert_review(self.complete("p3"))
        event = self.event("Stop", "p3")
        event["stop_hook_active"] = True
        self.quiet(event)
        self.quiet(self.event("Stop", "p3"))
        self.assertTrue(self.state()["issued"])

    def test_pending_or_declined_review_never_repeats_after_restart(self):
        self.complete("p1")
        self.complete("p2")
        self.assert_review(self.complete("p3"))
        issued = self.state_path().read_bytes()
        for prompt in range(4, 12):
            self.assertEqual(self.complete(str(prompt)), "")
        self.assertEqual(self.state_path().read_bytes(), issued)

    def test_duplicate_submissions_and_stops_do_not_count(self):
        self.complete("p1")
        self.quiet(self.event("Stop", "p1"))
        self.quiet(self.event("UserPromptSubmit", "p2"))
        self.quiet(self.event("UserPromptSubmit", "p2"))
        self.quiet(self.event("UserPromptSubmit", "p1"))
        self.quiet(self.event("Stop", "p1"))
        self.quiet(self.event("Stop", "p2"))
        self.assertEqual(len(self.state()["completed_prompt_ids"]), 2)
        self.assert_review(self.complete("p3"))

    def test_fresh_session_is_independent(self):
        for session in ("session", "fresh-session"):
            self.assertEqual(self.complete("p1", session), "")
            self.assertEqual(self.complete("p2", session), "")
            self.assert_review(self.complete("p3", session))
        self.assertEqual(len(list(self.directory.glob("*.json"))), 2)

    def test_identical_text_distinct_ids_and_private_state(self):
        for prompt in ("p1", "p2", "p3"):
            self.quiet(self.event("UserPromptSubmit", prompt, "../SECRET-session",
                                  prompt="SECRET same text",
                                  transcript_path="/SECRET/transcript"))
            result = self.invoke(self.event("Stop", prompt, "../SECRET-session"))
            self.assertEqual(result.stderr, "")
        self.assert_review(result.stdout)
        for path in self.directory.iterdir():
            self.assertNotIn("SECRET", path.name)
            self.assertNotIn("SECRET", path.read_text())
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.directory.stat().st_mode), 0o700)

    def test_interrupted_prompt_and_late_stop_do_not_count(self):
        self.quiet(self.event("UserPromptSubmit", "interrupted"))
        self.quiet(self.event("UserPromptSubmit", "p1"))
        self.quiet(self.event("Stop", "interrupted"))
        self.quiet(self.event("Stop", "p1"))
        self.assertEqual(self.complete("p2"), "")
        self.assert_review(self.complete("p3"))

    def test_stop_requires_matching_submission(self):
        self.quiet(self.event("Stop", "unregistered"))
        self.assertFalse(self.state_path().exists())
        self.quiet(self.event("UserPromptSubmit", "p1"))
        self.quiet(self.event("Stop", "different"))
        self.assertEqual(self.state()["completed_prompt_ids"], [])

    def test_ignored_events_do_not_touch_state(self):
        self.complete("p1")
        original = self.state_path().read_bytes()
        for name in ("UserPromptSubmit", "Stop"):
            for field in ("session_id", "prompt_id"):
                for value in (None, ""):
                    event = self.event(name, "ignored")
                    event[field] = value
                    self.quiet(event)
                del event[field]
                self.quiet(event)
            self.quiet(self.event(name, "ignored", agent_id="subagent"))
            event = self.event(name, "ignored")
            event["stop_hook_active"] = True
            self.quiet(event)
        for name in ("SubagentStop", "SessionEnd", "StopFailure"):
            self.quiet(self.event(name, "ignored"))
        self.assertEqual(self.state_path().read_bytes(), original)

    def test_concurrent_duplicate_stops_emit_once(self):
        self.complete("p1")
        self.complete("p2")
        self.quiet(self.event("UserPromptSubmit", "p3"))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(self.invoke, [self.event("Stop", "p3")] * 8))
        outputs = [result.stdout for result in results if result.stdout]
        self.assertEqual(len(outputs), 1)
        self.assert_review(outputs[0])
        self.assertTrue(all(result.returncode == 0 for result in results))
        self.quiet(self.event("Stop", "p3"))

    def test_lock_contention_fails_closed_and_retry_recovers(self):
        self.complete("p1")
        self.complete("p2")
        self.quiet(self.event("UserPromptSubmit", "p3"))
        with self.state_path().with_suffix(".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.failed_closed(self.invoke(self.event("Stop", "p3")))
        self.assert_review(self.invoke(self.event("Stop", "p3")).stdout)

    def test_malformed_input_has_no_output_or_sensitive_diagnostic(self):
        for payload in ("{SECRET", "[]", "null", "42"):
            self.failed_closed(self.invoke(payload))
        event = self.event("Stop")
        for field, value in (("session_id", ["SECRET"]), ("prompt_id", 42),
                             ("stop_hook_active", "SECRET")):
            self.failed_closed(self.invoke(dict(event, **{field: value})))
        self.assertFalse(self.directory.exists())

    def test_corrupt_committed_state_is_never_reset(self):
        self.complete("p1")
        self.complete("p2")
        self.assert_review(self.complete("p3"))
        issued = self.state()
        for payload in ("{SECRET", "{}", "[]", "null",
                        json.dumps(dict(issued, issued=False)),
                        json.dumps(dict(issued, issued="SECRET")),
                        json.dumps(dict(issued, completed_prompt_ids=[{}])),
                        json.dumps(dict(issued, completed_prompt_ids=["0" * 64] * 3))):
            self.state_path().write_text(payload)
            for name in ("UserPromptSubmit", "Stop"):
                self.failed_closed(self.invoke(self.event(name, "p4")))
            self.assertEqual(self.state_path().read_text(), payload)

    def test_partial_temp_write_keeps_committed_state(self):
        self.complete("p1")
        self.complete("p2")
        orphan = self.state_path().with_suffix(".partial.tmp")
        orphan.write_text('{"issued":')
        self.assert_review(self.complete("p3"))
        self.assertEqual(orphan.read_text(), '{"issued":')
        self.quiet(self.event("Stop", "p3"))

    def test_unavailable_state_path_has_no_review(self):
        self.state_root.write_text("SECRET not a directory")
        self.failed_closed(self.invoke(self.event("UserPromptSubmit")))
        self.failed_closed(self.invoke(self.event("Stop")))
        self.assertEqual(self.state_root.read_text(), "SECRET not a directory")

    @unittest.skipIf(os.geteuid() == 0, "root bypasses directory write permissions")
    def test_failed_state_write_preserves_state_and_retry_recovers(self):
        self.complete("p1")
        self.complete("p2")
        self.quiet(self.event("UserPromptSubmit", "p3"))
        before = self.state_path().read_bytes()
        self.directory.chmod(0o500)
        try:
            self.failed_closed(self.invoke(self.event("Stop", "p3")))
            self.assertEqual(self.state_path().read_bytes(), before)
        finally:
            self.directory.chmod(0o700)
        self.assert_review(self.invoke(self.event("Stop", "p3")).stdout)
        self.quiet(self.event("Stop", "p3"))

    def test_dangling_state_link_is_not_treated_as_new_session(self):
        self.directory.mkdir(parents=True)
        missing = self.home / "missing"
        self.state_path().symlink_to(missing)
        self.failed_closed(self.invoke(self.event("UserPromptSubmit")))
        self.assertTrue(self.state_path().is_symlink())
        self.assertFalse(missing.exists())

    def test_home_state_fallback(self):
        for value in (None, ""):
            if value is None:
                self.env.pop("XDG_STATE_HOME")
            else:
                self.env["XDG_STATE_HOME"] = value
            self.quiet(self.event("UserPromptSubmit"))
        fallback = self.home / ".local/state/auto-improve/claude" / self.state_path().name
        self.assertTrue(fallback.exists())
        self.assertFalse(self.directory.exists())

    def install_hook(self):
        # Run only the hook link section; the root installer changes the host.
        installer = (ROOT / "install.sh").read_text()
        block = installer.split('mkdir -p "$HOME/.claude/hooks"', 1)[1].split("# Tmux", 1)[0]
        return subprocess.run(
            ["sh", "-eu", "-c", 'setup_path=$1; mkdir -p "$HOME/.claude/hooks"\n' + block,
             "install-hook-test", str(ROOT)],
            env=self.env, text=True, capture_output=True, timeout=5,
        )

    def test_install_is_repeatable_and_preserves_puppet_dcg(self):
        hooks = self.home / ".claude/hooks"
        hooks.mkdir(parents=True)
        dcg = hooks / "dcg"
        dcg.write_text("Puppet-managed wrapper")
        destination = hooks / "auto-improve.py"
        self.assertEqual(self.install_hook().returncode, 0)
        before = destination.lstat()
        self.assertEqual(destination.readlink(), HOOK)
        self.assertEqual(self.install_hook().returncode, 0)
        self.assertEqual(destination.lstat().st_ino, before.st_ino)
        self.assertEqual(destination.lstat().st_mtime_ns, before.st_mtime_ns)
        self.assertEqual(dcg.read_text(), "Puppet-managed wrapper")
        self.assertFalse(dcg.is_symlink())

    def test_install_preserves_unexpected_destinations(self):
        hooks = self.home / ".claude/hooks"
        hooks.mkdir(parents=True)
        destination = hooks / "auto-improve.py"
        destination.write_text("existing hook")
        result = self.install_hook()
        self.assertEqual(result.returncode, 73)
        self.assertIn("Cannot replace existing Claude auto-improve hook", result.stderr)
        self.assertEqual(destination.read_text(), "existing hook")
        destination.unlink()
        destination.symlink_to(self.home / "missing")
        self.assertEqual(self.install_hook().returncode, 73)
        self.assertEqual(destination.readlink(), self.home / "missing")
        destination.unlink()
        destination.mkdir()
        self.assertEqual(self.install_hook().returncode, 73)
        self.assertEqual(list(destination.iterdir()), [])

    def test_settings_commands_deliver_review_through_installed_link(self):
        self.assertEqual(self.install_hook().returncode, 0)
        hooks = json.loads((ROOT / "terminal/claude/settings.json").read_text())["hooks"]
        self.assertEqual(hooks["PreToolUse"], [{"matcher": "Bash", "hooks": [
            {"type": "command", "command": "~/.claude/hooks/dcg"}
        ]}])
        for prompt in ("p1", "p2", "p3"):
            for name in ("UserPromptSubmit", "Stop"):
                hook = hooks[name][0]["hooks"][0]
                self.assertEqual(hook["type"], "command")
                self.assertEqual(hook["timeout"], 5)
                result = self.invoke(self.event(name, prompt), ["sh", "-c", hook["command"]])
                self.assertEqual((result.returncode, result.stderr), (0, ""))
                if name == "Stop" and prompt == "p3":
                    self.assert_review(result.stdout)
                else:
                    self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
