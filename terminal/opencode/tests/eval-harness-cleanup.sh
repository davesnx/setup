#!/usr/bin/env bash

set -euo pipefail

root=$(CDPATH='' cd "$(dirname "$0")/../../.." && pwd)
hook="$root/terminal/opencode/eval-harness-cleanup.bash"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

run_case() {
	local name=$1
	local debug=$2
	local expected_exit=$3
	local state="$work/$name"
	local exit_code=0

	if BASH_ENV="$hook" /bin/bash -c '
		STATE_DIR=$1
		RUN_DIR="$STATE_DIR/runs/test"
		DEBUG=$2
		mkdir -p \
			"$RUN_DIR/case/sandbox" \
			"$RUN_DIR/case/stability/sample-2/sandbox" \
			"$RUN_DIR/case/workdir/sandbox"
		printf "report\n" >"$RUN_DIR/case/transcript.jsonl"
		exit "$3"
	' run.sh "$state" "$debug" "$expected_exit"; then
		exit_code=0
	else
		exit_code=$?
	fi

	[[ $exit_code == "$expected_exit" ]]
	[[ -f "$state/runs/test/case/transcript.jsonl" ]]
	[[ -d "$state/runs/test/case/workdir/sandbox" ]]

	if [[ $debug == 1 ]]; then
		[[ -d "$state/runs/test/case/sandbox" ]]
		[[ -d "$state/runs/test/case/stability/sample-2/sandbox" ]]
	else
		[[ ! -e "$state/runs/test/case/sandbox" ]]
		[[ ! -e "$state/runs/test/case/stability/sample-2/sandbox" ]]
	fi
}

run_case normal 0 12
run_case debug 1 0
