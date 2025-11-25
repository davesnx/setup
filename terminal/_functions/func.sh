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
	if [[ -n "$@" ]]; then
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
