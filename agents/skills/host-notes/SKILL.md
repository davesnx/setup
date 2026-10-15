---
name: host-notes
description: Use when binding a service or dev server on the nspawn host, or when a Bash tool command on the Mac loses a temp file, reads an empty pipeline status, or masks a background exit code.
---

## nspawn services

When `systemd-detect-virt --container` returns `systemd-nspawn`, bind a service
to `0.0.0.0` on an unused port from `25000-25099`. Reach it at
`febox-uk.ahrefs.net:<port>` while the VPN is on.

## Bash tool on the Mac

- Commands in the sandbox `excludedCommands` setting, such as `make`, `git`,
  `gh`, and `docker`, run outside the sandbox and see the system `$TMPDIR`.
  Write a file that another command must read to the session scratchpad or the
  repository, not to `$TMPDIR`.
- Let a background command's exit code reach the task; do not append an `echo`
  that masks it.
- The Bash tool shell is zsh, so `$PIPESTATUS` is empty. Use `$pipestatus[1]`
  or `set -o pipefail` to check a pipeline's exit code.
