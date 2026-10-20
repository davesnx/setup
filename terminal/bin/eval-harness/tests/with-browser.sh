#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  printf 'Usage: bash tests/with-browser.sh COMMAND [ARGUMENTS...]\n' >&2
  exit 64
fi

if [[ -z ${EVAL_CHROMIUM_BIN:-} ]]; then
  EVAL_CHROMIUM_BIN=''
  for browser in chromium chromium-browser google-chrome google-chrome-stable brave-browser microsoft-edge; do
    if executable=$(type -P "$browser"); then
      EVAL_CHROMIUM_BIN=$executable
      break
    fi
  done
  if [[ -z "$EVAL_CHROMIUM_BIN" && $(uname -s) == Darwin ]]; then
    root=$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../../.." && pwd)
    EVAL_CHROMIUM_BIN=$(bash "$root/mac/tests/find-chromium.sh") || {
      printf 'No Chromium browser found. Set EVAL_CHROMIUM_BIN to an installed executable.\n' >&2
      exit 127
    }
  fi
fi

if [[ -z "$EVAL_CHROMIUM_BIN" ]] || ! executable=$(type -P "$EVAL_CHROMIUM_BIN") || [[ ! -f "$executable" || ! -x "$executable" ]]; then
  printf 'Chromium executable unavailable: %s. Set EVAL_CHROMIUM_BIN to an installed executable.\n' "$EVAL_CHROMIUM_BIN" >&2
  exit 127
fi

if [[ "$executable" != /* ]]; then
  executable="$PWD/$executable"
fi
export EVAL_CHROMIUM_BIN="$executable"
exec "$@"
