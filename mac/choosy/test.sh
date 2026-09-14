#!/bin/sh

set -eu

source_dir=$(CDPATH='' cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
HOME="$work/home with spaces & symbols"
SETUP_BACKUP_ROOT="$work/backups"
export HOME SETUP_BACKUP_ROOT
mkdir -p "$HOME" "$work/bin"

cat >"$work/bin/pgrep" <<'EOF'
#!/bin/sh
exit "${CHOOSY_RUNNING_EXIT:-1}"
EOF
cat >"$work/bin/defaults" <<'EOF'
#!/bin/sh
set -eu
[ "$2" = com.choosyosx.Choosy ]
case "$1" in
  read) [ -f "$HOME/preferences.plist" ] ;;
  export) cp "$HOME/preferences.plist" "$3" ;;
  import) cp "$3" "$HOME/preferences.plist" ;;
  *) exit 2 ;;
esac
EOF
chmod +x "$work/bin/pgrep" "$work/bin/defaults"
PATH="$work/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH

destination="$HOME/Library/Application Support/Choosy"
mkdir -p "$destination"
printf 'test license, not a real key\n' >"$destination/.key"
cp "$destination/.key" "$work/expected-key"

CHOOSY_RUNNING_EXIT=0
export CHOOSY_RUNNING_EXIT
if sh "$source_dir/install.sh"; then
  printf 'Expected restore to refuse a running Choosy.\n' >&2
  exit 1
fi
[ ! -e "$destination/behaviours.plist" ]
[ ! -d "$SETUP_BACKUP_ROOT" ]
unset CHOOSY_RUNNING_EXIT

sh "$source_dir/install.sh"
cmp "$destination/.key" "$work/expected-key"
expected_path="$HOME/Library/Application Support/BraveSoftware/Brave-Browser"
index=0
while [ "$index" -lt 12 ]; do
  [ "$(plutil -extract "$index.behaviourArgument.supportPath" raw "$destination/behaviours.plist")" = "$expected_path" ]
  index=$((index + 1))
done
index=0
while [ "$index" -lt 3 ]; do
  [ "$(plutil -extract "browsers.$index.supportPath" raw "$HOME/preferences.plist")" = "$expected_path" ]
  index=$((index + 1))
done
cp "$destination/behaviours.plist" "$work/expected-rules"
cp "$HOME/preferences.plist" "$work/expected-preferences"

sh "$source_dir/install.sh"
cmp "$destination/.key" "$work/expected-key"
cmp "$destination/behaviours.plist" "$work/expected-rules"
cmp "$HOME/preferences.plist" "$work/expected-preferences"
backups=0
for backup in "$SETUP_BACKUP_ROOT"/choosy/restore.*; do
  [ ! -e "$backup/.key" ]
  if [ -e "$backup/behaviours.plist" ]; then
    cmp "$backup/behaviours.plist" "$work/expected-rules"
    cmp "$backup/preferences.plist" "$work/expected-preferences"
    backups=$((backups + 1))
  fi
done
[ "$backups" -eq 1 ]
printf 'PASS: Choosy restore guards running app, rewrites paths, backs up settings, and preserves license\n'
