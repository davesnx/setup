---
name: loop-on-ci
description: Debug and fix failing GitHub PR checks and loop until green. Use when a user asks to fix CI, fix failing checks, debug a red PR, or watch checks until they pass. Uses gh pr checks as the source of truth for PR-attached checks. Accepts an optional PR number or URL. External providers (for example Buildkite) are out of scope; report only the details URL.
---

# Loop on CI

Find failing PR checks, diagnose them from logs, apply focused fixes, and repeat until all required checks are green.

## Inputs

- `pr` (optional): PR number or URL. Defaults to the PR for the current branch.
- `gh` authentication for the repo host. If `gh auth status` fails, ask the user to run `gh auth login` (repo + workflow scopes) before proceeding.

Use `gh pr checks` as the source of truth. It includes all PR-attached checks, while `gh run list` only covers GitHub Actions.

## Workflow

1. Verify auth (`gh auth status`) and resolve the PR: `gh pr view --json number,url,headRefName`, or use the provided number/URL.
2. Inspect current PR checks before waiting. Preferred: run the bundled script, which handles `gh` field drift and job-log fallbacks:
   - `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "<number-or-url>"`
   - Add `--json` for machine-friendly output.
3. If checks already failed, diagnose those failures first. For GitHub Actions checks, pull logs:
   - `gh run view <run-id> --log-failed`
   - If the run log claims it is still in progress, fetch job logs directly: `gh api "/repos/<owner>/<repo>/actions/jobs/<job_id>/logs"`
4. If a failing check's `detailsUrl` is not a GitHub Actions run, label it external and report only the URL. Do not attempt Buildkite or other providers.
5. If checks are pending, watch with `gh pr checks --watch --fail-fast`.
6. Fix each actionable failure, push, then re-check the full PR check set. Repeat until green.

## Commands

```bash
# Resolve the active PR
gh pr view --json number,url,headRefName

# Inspect all attached checks
gh pr checks --json name,bucket,state,workflow,link

# Watch pending checks and fail fast
gh pr checks --watch --fail-fast

# GitHub Actions logs, when the failing check links to a GHA run
gh run view <run-id> --log-failed

# Bundled inspector: failing checks + log snippets, exits non-zero while failures remain
python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "123" --json
```

## Guardrails

- Keep each fix scoped to a single failure cause when possible.
- Do not bypass hooks (`--no-verify`) to force progress.
- If the failure is clearly unrelated to the PR and appears fixed on main, merge latest main instead of bloating the PR with unrelated fixes.
- If failures are flaky, retry once and report flake evidence.
- Re-run `gh pr checks --json name,bucket,state,workflow,link` after every push; the check set can change. If a `--json` field is rejected, rerun with the fields `gh` reports as available.
- Call out missing or unreachable logs explicitly instead of guessing at the cause.

## Bundled resources

### scripts/inspect_pr_checks.py

Fetches failing PR checks, pulls GitHub Actions logs, and extracts a failure snippet. Exits non-zero when failures remain, so it can drive the loop in automation.

- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "123"`
- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "https://github.com/org/repo/pull/123" --json`
- `python "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --max-lines 200 --context 40`

## Output

- Current CI status
- Failure summary and fixes applied (external checks listed with their details URL only)
- PR URL once checks are green
