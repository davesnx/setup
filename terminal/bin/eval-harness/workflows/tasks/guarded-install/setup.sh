#!/bin/bash
set -eu
test ! -L .fixture-root
test "$(< .fixture-root)" = workflow-disposable-repository
test ! -L .git
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_DATE='2000-01-01T00:00:00Z' GIT_COMMITTER_DATE='2000-01-01T00:00:00Z'
if test ! -d .git; then
  git -c init.defaultBranch=fixture init --template= . >/dev/null
fi
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git add -- .fixture-root CONTRACT.md install.sh prelude.sh tool.txt notes.txt test.cjs
  git -c user.name=Fixture -c user.email=fixture@example.invalid commit -qm baseline
fi
if test ! -f .git/workflow-ready; then
  printf 'staged user note\n' > notes.txt
  git add -- notes.txt
  printf 'working user note\n' > notes.txt
  printf 'ready\n' > .git/workflow-ready
fi
