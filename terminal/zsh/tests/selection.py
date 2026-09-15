#!/usr/bin/env python3
"""Exercise selection through real ZLE keystrokes, with the installed Zim plugins."""

import os
from pathlib import Path
import pty
import select
import subprocess
import termios
import time


ROOT = Path(__file__).resolve().parents[3]
ZIM_HOME = Path(os.environ.get("ZIM_HOME", Path.home() / ".zim"))
SNAPSHOT = b"\x18\x14"
LEFT = b"\x1b[D"
RIGHT = b"\x1b[C"
SHIFT_LEFT = b"\x1b[1;2D"
SHIFT_RIGHT = b"\x1b[1;2C"
WORD_LEFT = b"\x1b[1;4D"
WORD_RIGHT = b"\x1b[1;4C"
COPY = b"\x1b[1;2P"
CUT = b"\x1b[1;2Q"

SCRIPT = r'''
bindkey -e
WORDCHARS=""
HISTFILE=/dev/null
source "$ZIM_HOME/modules/input/init.zsh"
source "$ZIM_HOME/modules/zsh-shift-select/zsh-shift-select.plugin.zsh"
source "$ZIM_HOME/modules/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
source "$SELECTION_ROOT/terminal/zsh/selection.zsh"
source "$ZIM_HOME/modules/zsh-autosuggestions/zsh-autosuggestions.zsh"
_zsh_autosuggest_start

# Capture pbcopy input without changing the desktop clipboard.
_selection_test_clipboard=unchanged
pbcopy() {
  local copied
  IFS= read -r -d '' copied
  [[ "$SELECTION_CLIPBOARD_FAIL" == 1 ]] && return 1
  _selection_test_clipboard=$copied
  return 0
}

_selection_test_snapshot() {
  local snapshot="$BUFFER"$'\0'"$CURSOR"$'\0'"$MARK"$'\0'"$REGION_ACTIVE"$'\0'"$KEYMAP"$'\0'"$_selection_test_clipboard"$'\0'
  if [[ -n "$SELECTION_STATE" ]]; then
    print -rn -- "$snapshot" >| "$SELECTION_STATE"
  else
    print -rn -u "$SELECTION_FD" -- "$snapshot"
  fi
}
_selection_test_init() {
  CURSOR=$SELECTION_CURSOR
  _selection_test_snapshot
}
zle -N _selection_test_snapshot
zle -N zle-line-init _selection_test_init
bindkey -M emacs '^X^T' _selection_test_snapshot
bindkey -M shift-select '^X^T' _selection_test_snapshot
buffer=$SELECTION_BUFFER
vared buffer
'''


def check(name, keys, expected, cursor=None, selected=None, initial="hello world", start=None,
          clipboard="unchanged", clipboard_failure=False):
    master, slave = pty.openpty()
    termios.tcsetwinsize(slave, (40, 120))
    reader, writer = os.pipe()
    env = dict(os.environ, TERM="xterm-256color", ZIM_HOME=str(ZIM_HOME),
               SELECTION_ROOT=str(ROOT), SELECTION_FD=str(writer),
               SELECTION_BUFFER=initial, SELECTION_CURSOR=str(len(initial) if start is None else start),
               SELECTION_CLIPBOARD_FAIL=str(int(clipboard_failure)))
    process = subprocess.Popen(
        ["/bin/zsh", "-f", "-i", "-c", SCRIPT], env=env,
        stdin=slave, stdout=slave, stderr=slave, pass_fds=(writer,), start_new_session=True,
    )
    os.close(slave)
    os.close(writer)
    output = bytearray()

    def state():
        data = bytearray()
        deadline = time.monotonic() + 10
        while data.count(0) < 6:
            if time.monotonic() >= deadline:
                raise AssertionError(f"{name}: timed out: {output.decode(errors='replace')}")
            ready, _, _ = select.select([reader, master], [], [], 0.1)
            for fd in ready:
                chunk = os.read(fd, 65536)
                if not chunk:
                    raise AssertionError(f"{name}: shell exited: {output.decode(errors='replace')}")
                if fd == reader:
                    data.extend(chunk)
                else:
                    output.extend(chunk)
        buffer, position, mark, active, keymap, copied = data.split(b"\0")[:6]
        return buffer.decode(), int(position), int(mark), int(active), keymap.decode(), copied.decode()

    try:
        state()
        os.write(master, keys)
        if clipboard_failure:
            # ZLE redraws its error message before accepting the next keystroke.
            deadline = time.monotonic() + 5
            while b'Could not copy selection to the clipboard' not in output:
                assert time.monotonic() < deadline, (name, "missing clipboard error")
                ready, _, _ = select.select([master], [], [], 0.1)
                if ready:
                    output.extend(os.read(master, 65536))
        os.write(master, SNAPSHOT)
        buffer, position, mark, active, keymap, copied = state()
        assert buffer == expected, (name, "buffer", buffer, expected)
        assert copied == clipboard, (name, "clipboard", copied, clipboard)
        if cursor is not None:
            assert position == cursor, (name, "cursor", position, cursor)
        if selected is not None:
            assert bool(active) == selected, (name, "selection", active)
            assert keymap == ("shift-select" if selected else "main"), (name, "keymap", keymap)
        print(f"PASS: {name}")
    finally:
        process.kill()
        process.wait(timeout=5)
        os.close(master)
        os.close(reader)


if __name__ == "__main__":
    check("character selection", SHIFT_LEFT * 3, "hello world", 8, True)
    check("word selection", WORD_LEFT, "hello world", 6, True)
    check("forward word selection", WORD_RIGHT, "hello world", 11, True, start=6)
    check("shrink selection", SHIFT_LEFT * 3 + SHIFT_RIGHT, "hello world", 9, True)
    check("backspace selection", WORD_LEFT + b"\x7f", "hello ", 6, False)
    check("forward delete selection", WORD_LEFT + b"\x1b[3~", "hello ", 6, False)
    check("Option Delete selection", SHIFT_LEFT * 2 + b"\x1b\x7f", "hello wor", 9, False)
    check("typing replaces selection", WORD_LEFT + b"friend", "hello friend", 12, False)
    check("Unicode replaces selection", WORD_LEFT + "niño🙂".encode(), "hello niño🙂", 11, False)
    check("paste replaces selection", WORD_LEFT + b"\x1b[200~new text\x1b[201~", "hello new text", 14, False)
    check("collapse left", WORD_LEFT + LEFT, "hello world", 6, False)
    check("collapse right", WORD_LEFT + RIGHT, "hello world", 11, False)
    check("application cursor mode", WORD_LEFT + b"\x1bOC", "hello world", 11, False)
    check("ordinary navigation", LEFT + b"!", "hello worl!d", 11, False)
    check("ordinary word deletion", b"\x1b\x7f", "hello ", 6, False)
    check("word navigation cancels selection", SHIFT_LEFT + b"\x1bb", "hello world", 6, False)
    check("forward word navigation cancels selection", WORD_LEFT + b"\x1bf", "hello world", 11, False)
    check("typing after cancellation", WORD_LEFT + RIGHT + b"!", "hello world!", 12, False)
    check("undo replacement", WORD_LEFT + b"x\x1f", "hello world", 6, False)
    check("undo word deletion", b"\x1b\x7f\x1f", "hello world", 11, False)
    check("undo selection deletion", WORD_LEFT + b"\x7f\x1f", "hello world", 6, False)
    check("punctuation word boundary", WORD_LEFT + b"\x7f", "hello/", 6, False, initial="hello/world")
    check("selection at buffer start", SHIFT_LEFT + b"x", "xhello world", 1, False, start=0)
    check("multiline selection up", b"\x1b[1;2A" + b"\x7f", "one", 3, False, initial="one\ntwo")
    check("multiline selection down", b"\x1b[1;2B" + b"\x7f", "two", 0, False, initial="one\ntwo", start=0)
    check("ordinary up cancels selection", SHIFT_LEFT + b"\x1b[A", "one\ntwo", 2, False, initial="one\ntwo")
    check("ordinary down cancels selection", SHIFT_RIGHT + b"\x1b[B", "one\ntwo", 6, False, initial="one\ntwo", start=1)
    check("copy selection", WORD_LEFT + COPY, "hello world", 6, True, clipboard="world")
    check("copy forward selection", WORD_RIGHT + COPY, "hello world", 11, True, start=6, clipboard="world")
    check("copy keeps selection replaceable", WORD_LEFT + COPY + b"friend", "hello friend", 12, False, clipboard="world")
    check("cut selection", WORD_LEFT + CUT, "hello ", 6, False, clipboard="world")
    check("cut forward selection", WORD_RIGHT + CUT, "hello ", 6, False, start=6, clipboard="world")
    check("undo cut", WORD_LEFT + CUT + b"\x1f", "hello world", 6, False, clipboard="world")
    check("copy multiline selection", SHIFT_LEFT * 8 + COPY, "one\ntwo\n", 0, True,
          initial="one\ntwo\n", clipboard="one\ntwo\n")
    text = 'niño🙂 $HOME `pwd` \\ *'
    check("copy Unicode and literal shell syntax", SHIFT_LEFT * len(text) + COPY, text, 0, True,
          initial=text, clipboard=text)
    check("copy and cut without selection", COPY + CUT + b"!", "hello world!", 12, False)
    check("copy and cut with empty selection", SHIFT_LEFT + SHIFT_RIGHT + COPY + CUT, "hello world", 11, True)
    check("failed copy preserves cut selection", WORD_LEFT + CUT, "hello world", 6, True, clipboard_failure=True)
