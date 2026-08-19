---
name: sync-skills
description: 'Use when the user says "sync skills", "sync my skills", "update skills on remote", or wants to synchronize agent skills between this machine and a remote server. Performs a bidirectional rsync to ensure both environments have all skills.'
---

# Sync Skills

Bidirectionally synchronize `~/.agents/skills/` between this machine and a remote server using `rsync`, so both environments end up with the full union of all skills.

## Inputs

- `remote` (optional): SSH host alias or `user@host` to sync with. Auto-detected if not provided (see step 1).

## Workflow

1. **Detect which machine we are on and resolve the remote**:

   If the user did not provide a `remote`, auto-detect based on hostname:

   ```bash
   hostname
   ```

   - If the hostname contains `nspawn` or we are on Linux at `/home/me`, the remote is the user's Mac. The user must provide the SSH alias or address (e.g. `sync skills with macbook`), since the Mac may not be directly reachable via SSH. If unknown, ask the user.
   - Otherwise (macOS / local machine), default the remote to `nspawn`.

   If the remote cannot be determined, ask the user to specify it.

2. **Show current state**:

   List skills on both sides before syncing:

   ```bash
   echo "=== LOCAL ===" && ls ~/.agents/skills/ | sort
   echo "=== REMOTE ===" && ssh <remote> 'ls ~/.agents/skills/' | sort
   ```

   Present a short summary: which skills are local-only, remote-only, and shared.

3. **Pull remote skills to local**:

   ```bash
   rsync -avz <remote>:~/.agents/skills/ ~/.agents/skills/
   ```

   This fetches any skills that exist only on the remote and updates shared skills if the remote copy is newer.

4. **Push local skills to remote**:

   ```bash
   rsync -avz ~/.agents/skills/ <remote>:~/.agents/skills/
   ```

   This sends any skills that exist only locally (including the ones just pulled, ensuring file-level parity) and updates shared skills if the local copy is newer.

5. **Verify sync**:

   ```bash
   echo "=== LOCAL ===" && ls ~/.agents/skills/ | sort
   echo "=== REMOTE ===" && ssh <remote> 'ls ~/.agents/skills/' | sort
   ```

   Confirm both sides list the same set of skills. Report the final count and any discrepancies.

## Rules

- NEVER delete skills on either side. This is additive-only sync (`rsync` without `--delete`).
- NEVER sync files that look like secrets (`.env`, credentials, tokens). If encountered, warn the user and skip.
- For overlapping skills, the newer file wins (default rsync behavior based on mtime).
- If SSH connection fails, report the error clearly and suggest the user check their SSH config (`~/.ssh/config`) or connectivity.
- Always show a before/after summary so the user knows what changed.
- Default remote is `nspawn` unless the user specifies otherwise.
