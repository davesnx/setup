---
name: flipper
description: Use when the user asks to control a Flipper Zero over USB serial, inspect its device information or storage, read CLI output, release a busy serial port, or dump or emulate the user's own NFC cards. Uses the local flipper command. Not for firmware development, firmware flashing, general serial devices, or cards that do not belong to the user.
---

# Flipper Zero

Use the local `flipper` command to access the device's built-in CLI. It needs
Bun, `stty`, `lsof`, and `ps`. If the command is outside `PATH`, use
`terminal/bin/flipper` from the setup checkout.

## Check the connection

Run these commands on the machine connected to the Flipper by USB:

```sh
flipper help
flipper port
```

The device path comes from `--port`, then `FLIPPER_PORT`, then discovery:
`/dev/cu.usbmodemflip_*`, `/dev/serial/by-id/*Flipper*`, `/dev/ttyACM*`.
Discovery selects the first sorted path in the first matching group.
Use `--port /dev/...` if more than one device is connected.

## Keep one owner

Only one program can use the serial port at a time. Do not run parallel
Flipper commands. Close the user's screen session, qFlipper connection, or
browser serial connection before sending commands.

If the port is busy, report its PID and command. Ask before terminating a
session unless the user has already asked you to free the port. Then run:

```sh
flipper release
flipper port
```

`release` sends SIGTERM only to `screen`, `SCREEN`, `minicom`, `tio`,
`picocom`, `cu`, and `socat`. It refuses when any other holder is present.
Ask the user to close those applications manually. Never kill a browser or
qFlipper to free the port. A busy report from `port` is not a command failure.

## Send CLI commands

```sh
flipper info
flipper ls /ext
flipper send 'help'
flipper send 'storage list /ext/'
flipper watch 5
```

Quote each complete CLI line as one argument. `send` writes CRLF-terminated
lines and collects each reply before sending the next line. `exec` and `run`
are aliases for `send`. `storage` is an alias for `ls`.

Options can appear before or after the command:

- `--timeout 10000` allows up to 10 seconds for the whole serial session.
  The default is 5000 ms.
- `--idle 1500` waits for 1500 ms of silence before ending each reply.
  The default is 800 ms.
- `watch` ignores the idle limit. Its seconds set the session duration unless
  an explicit `--timeout` is shorter.
- `--raw` keeps ANSI escapes. Output is plain text by default.
- `--json` returns `port`, `command`, `output`, and `busy`. Errors also include
  `error`. Fields that could not be resolved are `null`.

## Use NFC with the user's own cards

Only dump or emulate cards that belong to the user. Establish ownership
before running NFC commands. Do not use this workflow for someone else's
card or to bypass access controls.

List the saved files and use the exact device path:

```sh
flipper ls /ext/nfc
flipper send 'nfc' 'dump /ext/nfc/MyCard.nfc'
```

The built-in CLI has an `nfc` subshell. Send `nfc` and `dump <file>` in the
same invocation. For an authorized emulation of the user's own card, use:

```sh
flipper send --timeout 10000 'nfc' 'emulate /ext/nfc/MyCard.nfc'
```

Check the reply for the actual result. A timeout or exit status 0 only means
that the host finished collecting output. It does not prove that a card was
read, that emulation succeeded, or that emulation stopped. Check the device
and stop emulation there when finished. Do not assume the firmware preserves
or resets its subshell when the host closes the port. If the prompt is still
inside `nfc`, inspect its help before sending another top-level command.

## Report the result

State the device path, command, and observed reply. Report a busy port or
timeout without claiming success. Do not retry a state-changing command
until you know whether the first attempt took effect.

For options and verification commands, read
[`terminal/bin/README.md`](../../../terminal/bin/README.md#use-the-flipper-zero-cli).
