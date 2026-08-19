# GitHub Actions Adapter

## Requirements

Use `gh auth status` to verify repository and workflow access. If authentication fails, ask the user to authenticate. Do not handle credentials.

## Resolve And Inspect

Use the PR check set as the source of truth because it includes GitHub Actions and external providers:

```bash
gh pr view <pr> --json number,url,headRefName,headRefOid
gh pr checks <pr> --json name,bucket,state,workflow,link
```

Prefer the bundled inspector for GitHub Actions failures. It handles `gh` field drift, run extraction, job-log fallback, and concise snippets:

```bash
python "<path-to-loop-on-ci>/scripts/inspect_pr_checks.py" --repo "." --pr "<number-or-url>" --json
```

Manual fallback:

```bash
gh run view <run-id> --log-failed
gh api "/repos/<owner>/<repo>/actions/jobs/<job-id>/logs"
```

If `gh` rejects a JSON field, rerun with the available fields it reports.

## Watch

```bash
gh pr checks <pr> --watch --fail-fast
```

`gh pr checks` exits 1 for failing checks and 8 for pending checks. Interpret the table or JSON instead of treating every nonzero exit as a tooling failure.

Only this adapter fetches GitHub Actions logs. Route a check whose link points to Buildkite to the Buildkite adapter.
