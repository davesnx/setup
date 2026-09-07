---
name: ssh-transfer
description: Transfer files or directories between the local Mac and nspawn or another SSH host with ssh-transfer. Use for SSH uploads, downloads, copying remote artifacts to the Mac, or sending local files to nspawn. Not for publishing public download URLs or syncing agent skills through Git.
compatibility: Requires the setup ssh-transfer command on the Mac, SSH configuration, and rsync 3 or newer on both machines. Access to nspawn requires the VPN.
---

# SSH Transfer

Use the existing `ssh-transfer` command. Both upload and download connections
start on the Mac. Nspawn cannot connect to the Mac; reversing the file direction
does not reverse the SSH connection. No HTTP server or new forwarding is needed.

## Identify the execution machine

Run `uname -s` where your command tool executes. On Linux, check
`systemd-detect-virt --container` to identify nspawn.

- On the local Mac, run the transfer there.
- Inside nspawn, inspect the remote source or destination as needed, then give
  the exact command for the user's Mac terminal. Use an absolute nspawn path.
  If a separate Mac execution tool is available, verify its machine before use.
- If the machine is unclear, ask before transferring. Do not infer that your
  command tool runs on the Mac just because the user uses a Mac terminal.

When only nspawn execution is available, stop after providing the Mac command.
State that no transfer was run. Do not SSH from nspawn to localhost or the Mac.
The Mac's `~/Downloads` is not nspawn's `~/Downloads`.

## Prepare the transfer

Identify the source machine, source path, destination machine, and destination
path. Ask for missing paths rather than choosing a broad home or project folder.

On the Mac, check `command -v ssh-transfer` and read `ssh-transfer --help`.
If it is outside `PATH`, locate `terminal/bin/ssh-transfer` in the setup checkout
and use its full path. If the Mac's rsync is missing or too old, report that it
needs `brew install rsync`. Remote rsync failures need repair on the remote host.
Keep the VPN on for nspawn. Use existing SSH configuration for the user, port,
and host address.

Put options before the action. The default host is `nspawn`; use `--host ALIAS`
for another configured host. These examples all run on the Mac:

```sh
# Upload one local file to the nspawn home directory.
ssh-transfer push ~/Downloads/report.pdf .

# Download one nspawn file to the Mac.
ssh-transfer pull /home/me/report.pdf ~/Downloads/

# Download a directory's contents to the Mac.
ssh-transfer pull /home/me/results/ ./results/

# Preview changes without modifying the destination.
ssh-transfer --dry-run push ./reports/ reports/
```

## Apply path and safety rules

- Quote paths with spaces or shell characters. Pass exactly one source path and
  one destination path.
- Relative remote paths start at the remote user's home, not the current SSH
  directory. Avoid remote `~`; the local shell can expand it to the Mac's home.
- A source directory ending in `/` copies its contents. Without `/`, it copies
  the directory into an existing destination directory. Confirm the intended
  layout. Destination parent directories must already exist.
- Remote paths containing `*`, `?`, `[`, `]`, or backslash are rejected because
  rsync can select the wrong file. Copy a parent directory whose path lacks those
  characters only if its full contents are within the requested scope. Otherwise
  ask before expanding the transfer. Local paths and copied child names can
  contain these characters.
- Inspect a `--dry-run` before the actual transfer. Existing destination files
  can be overwritten; confirm replacements when the user has not authorized them.
  Unrelated destination files are not deleted.
- Keep the helper's protected arguments and disabled SSH forwarding. Do not add
  `--delete`, `--inplace`, or a fallback server to work around a failure.

## Verify and report

Wait for the actual command to exit successfully before reporting completion.
A dry-run or a command supplied for the Mac is not a completed transfer. Report
the direction and destination, or the failure and required next action.

For an interrupted transfer, rerun the same command to reuse destination
`.rsync-partial` data. Preserve failed-transfer errors instead of hiding them.
For detailed copy behavior and command tests, read the setup checkout's
[`terminal/bin/README.md`](../../../terminal/bin/README.md).
