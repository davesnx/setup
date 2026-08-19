#! /usr/bin/env bash

# Create a new directory and enter it
function mkd() {
	mkdir -p "$@" && cd "$_" || return;
}

function fs() {
	if du -b /dev/null > /dev/null 2>&1; then
		local arg=-sbh;
	else
		local arg=-sh;
	fi
	if (( $# > 0 )); then
		du $arg -- "$@";
	else
		du $arg .[^.]* ./*;
	fi;
}

# Run `dig` and display the most useful info
function digga() {
	dig +nocmd "$1" any +multiline +noall +answer;
}

function port {
  sudo lsof -i:"$1"
}

function restart-ssh {
  sudo launchctl stop com.openssh.sshd
  sudo launchctl start com.openssh.sshd
}

function denoflare {
  deno run --unstable --allow-read --allow-net --allow-env --allow-run \
  https://raw.githubusercontent.com/skymethod/denoflare/v0.5.3/cli/cli.ts "$@"
}

# Keep the skills CLI on the shared global skill directory.
function npx() {
	if [[ "$1" == "skills" ]]; then
		case "$2" in
			add|a|update|upgrade|remove|rm|list|ls)
				local subcommand="$2"
				shift 2
				command npx skills "$subcommand" --global "$@"
				return
				;;
		esac
	fi

	command npx "$@"
}

function eval-harness() {
	local harness_root="$HOME/.config/opencode/node_modules/@nano-step/eval-harness/scripts/eval"
	local command_name="${1:-run}"
	local opencode_bin
	local script

	if [[ ! -d "$harness_root" ]]; then
		printf 'eval-harness is not installed. Run ./opencode/install.sh first.\n' >&2
		return 1
	fi

	opencode_bin="$(command -v opencode)" || return 1

	case "$command_name" in
		run|baseline|accept|status|trend|promote)
			script="$harness_root/$command_name.sh"
			shift
			;;
		*)
			printf 'usage: eval-harness {run|baseline|accept|status|trend|promote} [options]\n' >&2
			return 2
			;;
	 esac

	OPENCODE_SKILLS_ROOT="$DOTFILES_PATH/skills" \
	ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-${OPENCODE_ANTHROPIC_API_KEY:-}}" \
	EVAL_SMOKE_MODEL="${EVAL_SMOKE_MODEL:-anthropic/claude-haiku-4-5}" \
	EVAL_FULL_MODEL="${EVAL_FULL_MODEL:-anthropic/claude-sonnet-4-6}" \
	EVAL_PRICING_FILE="$DOTFILES_PATH/opencode/eval-harness-pricing.json" \
	OPENCODE_REAL_BIN="$opencode_bin" \
	PATH="$DOTFILES_PATH/opencode/eval-bin:$PATH" \
	bash "$script" "$command_name" "$@"
}
