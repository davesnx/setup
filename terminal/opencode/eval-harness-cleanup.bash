#!/usr/bin/env bash

case "$0" in
	*/run.sh)
		cleanup_eval_sandboxes() {
			local exit_code=$?
			local sandboxes=()
			trap - EXIT

			if [[ ${DEBUG:-1} == 0 ]] &&
				[[ -n ${RUN_DIR:-} ]] &&
				[[ -n ${STATE_DIR:-} ]] &&
				[[ $RUN_DIR == "$STATE_DIR/runs/"* ]]; then
				shopt -s nullglob
				sandboxes=("$RUN_DIR"/*/sandbox "$RUN_DIR"/*/stability/sample-*/sandbox)
				if (( ${#sandboxes[@]} > 0 )); then
					rm -rf -- "${sandboxes[@]}" ||
						printf '[eval-harness] warning: could not remove sandboxes from %s\n' "$RUN_DIR" >&2
				fi
			fi

			exit "$exit_code"
		}

		trap cleanup_eval_sandboxes EXIT
		;;
esac
