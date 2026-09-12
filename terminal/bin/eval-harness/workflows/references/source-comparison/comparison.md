# Installer comparison

The executable snapshots contradict upstream/README.md on all three claims.
upstream/install.cjs selects the bundled script first, runs each restoration
script on every call, and removes an existing target without making a backup.
local/install.cjs backs up the old target before linking. node inspect.cjs
shows the bundled selection, two a/b restoration sequences, remove/link, then
backup/link. This is evidence about these small snapshots, not all versions.

Taking the upstream behavior would lose our backup guarantee. Repeated
restoration also requires each restoration script to be safe to repeat. Keep
the local link behavior unless overwriting without recovery is an explicit
requirement. The snapshots do not establish how either installer handles a
failed backup or link operation.
