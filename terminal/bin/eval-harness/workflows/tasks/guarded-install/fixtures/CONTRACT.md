# Guarded link

Run `sh install.sh SOURCE TARGET`. Both paths are explicit. Never default to
a home directory. A missing source fails before changing the target. An absent
target becomes a link. A correct link is unchanged. An old or broken link is
replaced. A regular file or directory returns 73 and remains untouched. Do not
make backups for this guarded destination. Tests use temporary directories.
