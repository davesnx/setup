# GitHub Actions Adapter

## Requirements

Use `gh auth status` to verify repository and workflow access. If authentication fails, ask the user to authenticate. Do not handle credentials.

## Resolve And Inspect

Use the PR check set as the source of truth because it includes GitHub Actions and external providers:

```bash
gh pr view <pr> --json number,url,headRefName,headRefOid
gh pr checks <pr> --json name,bucket,state,workflow,link
```

Prefer the `github` skill's CI failure inspector for GitHub Actions failures. It handles `gh` field drift, run extraction, job-log fallback, and concise snippets:

```bash
"$(dirname "${CLAUDE_SKILL_DIR:-$HOME/.agents/skills/ci}")/github/scripts/ci-failures.ts" --pr "<number>" -R "<owner>/<repo>" --json
```

Manual fallback:

```bash
gh run view <run-id> --log-failed
gh api "/repos/<owner>/<repo>/actions/jobs/<job-id>/logs"
```

If `gh` rejects a JSON field, rerun with the available fields it reports.

## Watch

Use these snapshots in each all-provider polling round described in [Watch](../SKILL.md#watch). Read the PR head before and after the provider snapshots; stop if it differs from the recorded commit. Inspect each recorded GitHub Actions run and its jobs, plus the current check set for that commit.

```bash
gh pr view <pr> --json headRefOid
gh pr checks <pr> --json name,bucket,state,workflow,link
gh run view <run-id> --json databaseId,headSha,status,conclusion,jobs
```

For branch targets, recheck the branch tip; for a fixed commit, verify the returned run's commit. Do not use `gh run watch` or `gh pr checks --watch`: either can hide another provider's failure or a target change while waiting. Bound snapshot requests by the round's remaining budget and return to the shared polling loop even when a run is pending.

Interpret the returned check states, not the `gh pr checks` exit code. A request timeout means unavailable data, not a CI result.

Only this adapter fetches GitHub Actions logs. Route a check whose link points to Buildkite to the Buildkite adapter.
