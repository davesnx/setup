# Buildkite Adapter

## Requirements

Use the Buildkite MCP server when its tools are in the session; `agents/mcp.json` configures it as `buildkite`. Fall back to the official CLI, `bk`, when the server is not connected but `bk` is installed and authenticated. If neither is available, report that Buildkite logs cannot be inspected, give the build URL, and ask the user to enable the server or authenticate `bk`. Do not handle tokens.

## Resolve The Build

Prefer an explicit Buildkite URL, pipeline, or build number. Otherwise match the current branch and commit.

MCP: `list_builds` filtered by pipeline, branch, and commit, then `get_build` for the selected build.

CLI:

```bash
bk build list --branch "$(git branch --show-current)" --commit "$(git rev-parse HEAD)" --limit 10 --json
bk build view <build-number> --pipeline <org>/<pipeline> --json
```

When the repository or URL does not identify the pipeline, pass `--pipeline <org>/<pipeline>`.

## Inspect Failures

MCP: `get_build_failure_summary` first; it aggregates the failed jobs, their last log entries, annotations, and test results. For more context on one job, `list_jobs` with a failed state filter, then `tail_logs`, `search_logs`, or `read_logs` on that job.

CLI:

```bash
bk job list --pipeline <org>/<pipeline> --build <build-number> --state failed,broken --json
bk job log <job-id> --agent --format markdown --max-tokens 4000
```

Use the job label, step key, command, exit status, and focused log window to identify the first actionable cause. Do not confuse downstream cancellations with root failures.

## Watch

Use these snapshots in each all-provider polling round described in [Watch](../SKILL.md#watch). Verify the recorded build and commit identity; do not switch to the latest build. Check jobs even while the build is running, since a failed job can coexist with pending jobs.

MCP: `get_build` and `list_jobs` for the recorded build. Do not use `wait_for_build`.

CLI:

```bash
bk build view <build-number> --pipeline <org>/<pipeline> --json
bk job list --pipeline <org>/<pipeline> --build <build-number> --json
```

Do not use `bk build watch`. Bound snapshot requests by the round's remaining budget, then return to the shared loop to recheck all providers and the requested target identity. A pending build does not extend the round or total deadline. A request timeout means unavailable data, not a CI result.

## Retry

Retry a failed job only when the user authorized retries and there is evidence of a flake: MCP `retry_job`, or `bk job retry <job-id>`. Do not use `rebuild_build`; it re-runs the whole build.
