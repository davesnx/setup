#!/usr/bin/env bash

set -euo pipefail

root=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
package="$root/node_modules/@nano-step/eval-harness"
bash "$package/scripts/eval/tests/cleanup.sh"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/runs/cli/case/sandbox" "$work/runs/cli/case/workdir/sandbox"
printf '0\n' > "$work/runs/cli/.finished"
"$root/eval-harness" --help >/dev/null
"$root/eval-harness" cleanup --help >/dev/null
EVAL_STATE_DIR="$work" "$root/eval-harness" cleanup --run=cli
[[ ! -e "$work/runs/cli/case/sandbox" && -d "$work/runs/cli/case/workdir/sandbox" ]]
