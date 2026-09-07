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
bash -n terminal/bin/tests/ssh-transfer.sh
shellcheck terminal/bin/ssh-transfer terminal/bin/tests/ssh-transfer.sh
shfmt -d -i 2 -ci terminal/bin/ssh-transfer terminal/bin/tests/ssh-transfer.sh
bash terminal/bin/tests/ssh-transfer.sh
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
