#!/bin/sh
set -eu
. "$(dirname "$0")/prelude.sh"
link_guarded "$1" "$2"
