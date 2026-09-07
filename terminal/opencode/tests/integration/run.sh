#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH='' cd "$(dirname "$0")/../.." && pwd)
scratch=$(mktemp -d "${TMPDIR:-/tmp}/opencode-permissions.XXXXXX")
trap 'rm -rf "$scratch"' EXIT HUP INT TERM

mkdir -p "$scratch/source/tests/integration" "$scratch/source/agents" "$scratch/home"
cp "$ROOT/opencode.jsonc" "$ROOT/agent-permission-boundaries.mjs" "$scratch/source/"
cp "$ROOT/agents/plan.md" "$ROOT/agents/writer.md" "$scratch/source/agents/"
cp "$ROOT/tests/integration/package.json" "$ROOT/tests/integration/package-lock.json" \
  "$ROOT/tests/integration/permissions.test.mjs" "$scratch/source/tests/integration/"

# The real config directory can be a repository symlink. Never install there.
env -i PATH="$PATH" HOME="$scratch/home" \
  XDG_CONFIG_HOME="$scratch/config" XDG_STATE_HOME="$scratch/state" \
  XDG_DATA_HOME="$scratch/data" XDG_CACHE_HOME="$scratch/cache" \
  SETUP_BACKUP_ROOT="$scratch/backups" \
  npm_config_cache="${SETUP_TEST_NPM_CACHE:-$scratch/npm-cache}" \
  npm_config_offline="${SETUP_TEST_OFFLINE:-false}" \
  npm ci --prefix "$scratch/source/tests/integration" --ignore-scripts --no-audit --no-fund

env -i PATH="$PATH" HOME="$scratch/home" \
  XDG_CONFIG_HOME="$scratch/config" XDG_STATE_HOME="$scratch/state" \
  XDG_DATA_HOME="$scratch/data" XDG_CACHE_HOME="$scratch/cache" \
  SETUP_BACKUP_ROOT="$scratch/backups" \
  node --test "$scratch/source/tests/integration/permissions.test.mjs"
