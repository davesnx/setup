# Open an OpenCode session

Run `ocs` to search OpenCode V2 sessions and open the selected session in its
working directory. The OpenTUI picker uses the setup `fosk` theme and the default
navigation keys from `/sessions`.

Install its dependencies from the setup repository root:

```sh
sh terminal/bin/ocs/install.sh
ocs
```

The setup shell adds `terminal/bin/ocs` to `PATH`. Open a new terminal to apply
this change to existing shells. You can also run `terminal/bin/ocs/ocs` directly.
Installation needs Node and npm. The command needs
OpenCode V2 on `PATH` and an interactive terminal. Its pinned Bun runtime is
installed locally with its dependencies.

| Key | Action |
| --- | --- |
| Type | Search session titles. |
| Up / Ctrl+P | Previous session, with wrap. |
| Down / Ctrl+N | Next session, with wrap. |
| Page Up / Page Down | Move ten sessions, with wrap. |
| Home / End | First / last session. |
| Ctrl+A | Switch between all projects and the current directory. |
| Enter | Open the selected session. |
| Esc | Cancel. |
| Ctrl+C | Clear the search. Press again to cancel. |

The picker starts with all projects and shows up to 50 root sessions, newest
first, grouped by update date. Search uses the OpenCode service, so it can find
older sessions. Current-directory scope uses OpenCode's project and relative
path, including matching paths in related worktrees. Outside a project, it
matches the exact directory.
Cancellation exits successfully. After selection, `ocs` returns OpenCode's exit
status. Run `ocs --help` for the key list.

Run its checks with:

```sh
npm --prefix terminal/bin/ocs run format:check
npm --prefix terminal/bin/ocs run check
npm --prefix terminal/bin/ocs test
```

The tests cover the picker, API responses, and terminal handoff with a fake
OpenCode command. `bash check.sh` installs dependencies and runs these checks.

# Run package scripts

Run `scripts` in a directory with `package.json` to select a script with fzf.
The `r` alias sources the same command in Zsh and adds the selected npm command
to interactive history. Both forms require jq and fzf. Use `scripts --help`
for controls and `scripts --version` for the version number.

Cancellation returns successfully without running npm. Invalid package data
and picker failures return an error. Once a script is selected, its exact name
is passed to npm and npm's exit status is returned. Sourcing preserves the
caller's variables and shell options.

# Count files

`count_files_recursive` counts regular files beneath the current directory,
including names with newlines. `count_files_recursive_per_directory` uses the
same counter for each non-hidden subdirectory and prints its name and count.

# Use the Flipper Zero CLI

`flipper` sends commands to the Flipper Zero's built-in CLI over USB serial.
It needs Bun, `stty`, `lsof`, and `ps` on `PATH`. Connect the device by USB.

```sh
flipper port
flipper info
flipper ls /ext/nfc
flipper send 'help'
flipper send 'nfc' 'dump /ext/nfc/MyCard.nfc'
flipper watch 5
```

Only one program can own the serial port. `flipper port` reports its holders
without opening it. Close screen, qFlipper, or the browser connection before
sending commands. `flipper release` sends SIGTERM only to `screen`, `SCREEN`,
`minicom`, `tio`, `picocom`, `cu`, or `socat`. If any other program holds the
port, it refuses to terminate anything and tells you to close that program.
It checks whether the port becomes free after sending SIGTERM.

## Commands and options

| Command | Action |
| --- | --- |
| `port` | Print the resolved device and whether it is free or busy, with holder PID and command. |
| `send <line>...` | Send each quoted CLI line in order. Aliases: `exec`, `run`. |
| `ls [path]` | Send `storage list <path>`. Default: `/ext`. A trailing slash is trimmed. Alias: `storage`. |
| `info` | Send `device_info`. |
| `watch [seconds]` | Read output for the given duration. Default: 5 seconds. |
| `release` | Terminate known serial-terminal holders. |
| `help` | Print usage. No command or an unknown command prints usage and exits with status 1. |

Options can appear before or after the command. Use `--` before literal
arguments that start with a hyphen.

- `--port <path>` selects an absolute device path. Otherwise, `FLIPPER_PORT`
  takes priority over discovery. Discovery checks `/dev/cu.usbmodemflip_*`,
  then `/dev/serial/by-id/*Flipper*`, then `/dev/ttyACM*`. Within each group,
  it selects the first path in sorted order.
- `--timeout <ms>` limits the whole serial session. Default: 5000 ms.
- `--idle <ms>` ends a reply after silence. Default: 800 ms. Multiple lines
  share the total timeout. Each line waits for its reply before the next line.
- `watch` ignores the idle timeout. Its duration replaces the default total
  timeout. An explicit `--timeout` can shorten that duration.
- `--raw` preserves ANSI escape sequences. They are removed by default.
- `--json` prints an object with `port`, `command`, `output`, and `busy`.
  Errors add `error` and return status 1. Unresolved fields are `null`.

The command configures 115200 baud in raw mode without terminal echo.
It does not interpret CLI replies as success or failure. A read timeout ends
collection and returns the text received so far. If the timeout prevents a
remaining line from being sent, the command reports an error.

Use NFC commands only with your own cards. Enter the `nfc` subshell and send
its command in the same invocation:

```sh
flipper send 'nfc' 'dump /ext/nfc/MyCard.nfc'
flipper send --timeout 10000 'nfc' 'emulate /ext/nfc/MyCard.nfc'
```

Closing the host serial connection does not prove that device-side emulation
has stopped. Check the device and stop it there when finished. See the
[Flipper skill](../../agents/skills/flipper/SKILL.md) for the agent workflow.

Run `bun test terminal/bin/flipper.test.ts` for the pure-logic tests.
They do not open a serial port or terminate a process.

# Transfer files over SSH

Use `ssh-transfer` from your Mac to copy files to or from nspawn. Both `push`
and `pull` connect from the Mac to nspawn. Nspawn does not need to connect to
the Mac. No HTTP server or additional open port is required.

## Requirements

- Use a Mac terminal, not a shell inside nspawn.
- Keep the VPN on and configure the `nspawn` host in `~/.ssh/config`.
- Install rsync 3 or newer on both machines. On the Mac, run `brew install rsync`.
  The setup Brewfile also includes it. The older bundled Mac rsync is not supported.
- Use the setup shell configuration, which adds `terminal/bin` to `PATH`.
  You can also run the command by its full path in this checkout.

## Copy files

Upload a file from the Mac to your home directory on nspawn:

```sh
ssh-transfer push ~/Downloads/report.pdf .
```

Download a file from nspawn to the Mac:

```sh
ssh-transfer pull /home/me/report.pdf ~/Downloads/
```

Preview a transfer before changing destination files:

```sh
ssh-transfer --dry-run push ./reports/ reports/
```

Copy a directory's contents from nspawn to the Mac:

```sh
ssh-transfer pull /home/me/results/ ./results/
```

Quote paths that contain spaces or shell characters:

```sh
ssh-transfer push './report final.pdf' 'reports/report final.pdf'
```

Parent directories must already exist. Rsync can create the last destination
directory, but it does not create missing parent directories.

## Transfer rules

- The default host is `nspawn`. To use another SSH alias, put `--host my-server`
  before `push` or `pull`. Configure the user, port, and address in `~/.ssh/config`.
- Give exactly one source path and one destination path. Put options before
  `push` or `pull`.
- Remote paths cannot contain `*`, `?`, `[`, `]`, or backslash. Rsync can expand
  these characters and select the wrong file. To transfer files with those
  names, copy their parent directory using a remote path without those characters.
  This restriction does not apply to local paths or names inside copied directories.
- Relative local paths start at your current Mac directory. Relative remote
  paths start at the remote user's home directory, not your current nspawn
  directory. Use `reports/file.pdf` or `/home/me/reports/file.pdf` for a remote
  path, not `~/reports/file.pdf`. Your local shell expands an unquoted `~`.
- A source directory with a trailing `/` copies its contents. Without `/`, it
  copies the directory into an existing destination directory.
- Rsync uses file size and modification time to decide which files to update.
  Destination files can be overwritten. Unrelated destination files are not
  deleted. Use `--dry-run` to check the expected changes.
- Transfers preserve modification times and symbolic links. File ownership is
  not copied. Existing destination file permissions stay unchanged. A symbolic
  link is copied as a link, not as the file it points to.
- Interrupted transfers keep partial data in `.rsync-partial` at the destination.
  Run the same command again to reuse that data.
- `--dry-run` still connects to nspawn to compare files, but does not transfer
  file contents or change destination files.
- Transfer connections disable configured SSH port and socket forwarding. This
  avoids conflicts with the existing browser opener socket.

Run `ssh-transfer --help` for the command syntax. A failed transfer returns the
rsync exit status. If SSH or remote rsync fails, its error is shown in the terminal.

## Check the command

From the setup repository root, run:

```sh
bash -n terminal/bin/ssh-transfer
bash -n agents/skills/ssh-transfer/tests/ssh-transfer.sh
shellcheck terminal/bin/ssh-transfer agents/skills/ssh-transfer/tests/ssh-transfer.sh
shfmt -d -i 2 -ci terminal/bin/ssh-transfer agents/skills/ssh-transfer/tests/ssh-transfer.sh
bash agents/skills/ssh-transfer/tests/ssh-transfer.sh
```

The tests require rsync 3 or newer. They use temporary files and a local test
transport instead of SSH. They do not test a live Mac-to-nspawn connection.

# Vendor published skills

Some skills in `agents/skills/` are also published for other people from their own
repository. `ocaml-mlx/skills` carries the mlx skills. The copies in this
repository are the working copies. `skill-vendor` moves changes in either
direction, only when asked. `agents/skills/VENDOR` lists each upstream repository,
its branch, the directory that holds the skills there (`.` for the root), the
commit the copies were last synced with, and the skill names.

See what changed on either side:

```sh
skill-vendor check
```

Take the upstream version of every listed skill and record its commit:

```sh
skill-vendor pull
```

Publish local edits as a commit on the upstream branch:

```sh
skill-vendor push -m "Clarify the component signature"
```

Publish them on a new branch for a pull request instead:

```sh
skill-vendor push --branch convert-reason-to-mlx -m "Add convert-reason-to-mlx skill"
```

Rules:

- `pull` stops when a skill has local edits. `pull --force` discards them.
- `push` stops when upstream moved. Run `pull` first. A `diverged` skill needs
  a manual merge.
- Clones live under `~/.cache/skill-vendor`. Both machines need SSH access to
  the upstream repository.
- A new skill also needs whatever the upstream repository asks for, such as a
  README row or a plugin manifest entry. Push it on a branch and finish those
  by hand in the pull request.
- Commit `agents/skills/VENDOR` together with the skill copies it describes.

The `skill-vendor` skill under `agents/skills/` gives agents this procedure. Its
test is `agents/skills/skill-vendor/tests/skill-vendor.sh`.

# Measure Zsh startup

`testzsh` starts login, interactive Zsh shells with `ZSH_BENCHMARK=1`. It needs
Bash 3.2 or newer and Zsh on `PATH`. Setup adds `terminal/bin` to `PATH`.

```sh
testzsh
testzsh --profile
testzsh --trace
```

An existing `testzsh` shell function takes precedence over the executable.
Run `unfunction testzsh` or start a new shell after this update.

| Option | Output |
| --- | --- |
| None | 25 `real`, `user`, and `sys` timing lines on stderr, with an `s` suffix on each value. |
| `--profile` | One startup's Zsh `zprof` function report on stdout. |
| `--trace` | One startup's file totals and top 20 source locations on stdout, sorted by elapsed time. Each row has milliseconds, event count, and an escaped source label. |
| `--help` | Command syntax and options. |

Unknown options, an empty argument, or multiple arguments return status 2.
A failed or incomplete run returns status 1 with a fixed error message.
Startup stdout and stderr are discarded in all modes. Diagnostics write through
separate descriptors into private temporary files and print only a completed
report. Temporary files are removed when the command exits.

## Startup and shutdown boundaries

The executable cannot inherit an unexported `ZDOTDIR`. Run `export ZDOTDIR`
first if you use one. The temporary `ZDOTDIR/.zshenv` bootstrap restores its
exported value exactly, including unset and empty states. It enables diagnostics
and sources the real user `.zshenv` at top level. Zsh loads system and user
`.zprofile`, `.zshrc`, and `.zlogin` files under normal startup rules. Changes
to `ZDOTDIR` apply to subsequent files. Empty `ZDOTDIR` does not use `HOME`.

Mandatory `/etc/zshenv` runs before the bootstrap. Default timing includes it;
diagnostic function and line measurements do not. Other system startup files
remain enabled. Bypassing the bootstrap causes a failure, not a partial report.

After startup, a fixed command unsets `HISTFILE` and disables `RCS` before the
shell exits. Completed runs therefore exclude history saving and logout files.
This changes the old default benchmark, which ended with `exit` and could run
logout work. Startup itself can still update caches or write files. If startup
calls `exit` or `exec` before this boundary, the command reports failure, but it
cannot prevent shutdown actions that startup already selected.

## Read the diagnostics

`--profile` uses `zsh/zprof`. It measures functions, including functions called
from profile and login files. It does not measure top-level commands.

`--trace` uses `zsh/datetime` and a `TRAPDEBUG` function with `DEBUG_BEFORE_CMD`.
Each event assigns the elapsed interval since the preceding command to that
command's source filename and line. The final startup interval is included.
File totals are exclusive: time inside a sourced file or function belongs to
the source location that runs it, rather than also being added to its caller.
Subshell commands are skipped. The parent's wait, including a command
substitution, belongs to the parent command.

The trace stores times and source locations in memory without reading command
text or using `xtrace`. It omits assignments, arguments, evaluated source, and
startup errors. Source labels are escaped shell strings. Anonymous locations
use `(unknown)` instead of an empty filename, retaining the line number.
Filenames remain visible, but control characters cannot create extra report
lines. The profiler also escapes control characters in function reports.

These are elapsed wall-clock intervals, not CPU samples. They include process
waits and some tracing overhead. The clock sample is taken at the end of each
trap to reduce that overhead. A backwards clock interval invalidates the report.
An existing DEBUG trap is rejected. A replaced trap or disabled
`DEBUG_BEFORE_CMD` at the report boundary also invalidates the trace. Startup
that temporarily removes and restores the same trap can leave undetected gaps.

Neither diagnostic runs a prompt or the interactive editor. Deferred work that
waits for them is outside the measurement. Use default timing for whole-process
comparisons and the diagnostics to find startup work to inspect.

Run `bash terminal/bin/testzsh.test.sh` for the isolated tests on macOS or nspawn.
See [Setup checks](../../TESTING.md) for the full verification commands.
