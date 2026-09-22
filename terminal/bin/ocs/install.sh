#!/bin/sh

set -eu
dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
npm ci --prefix "$dir" --no-audit --no-fund
