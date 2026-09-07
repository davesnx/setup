# Buildkite Adapter

## Requirements

Use the official Buildkite CLI, `bk`. If it is unavailable or unauthenticated, report that Buildkite logs cannot be inspected and provide the build URL. Ask the user to install or authenticate `bk`; do not handle tokens.

## Resolve The Build

Prefer an explicit Buildkite URL, pipeline, or build number. Otherwise use the current branch and commit:

```bash
bk build list --branch "$(git branch --show-current)" --commit "$(git rev-parse HEAD)" --limit 10 --json
```

When the repository or URL does not identify the pipeline, pass `--pipeline <org>/<pipeline>`.

Inspect a selected build:

```bash
bk build view <build-number> --pipeline <org>/<pipeline> --json
bk build view <build-number> --pipeline <org>/<pipeline> --job-states failed,broken
```

## Inspect Failures

List failed jobs for the selected build:

```bash
bk job list --pipeline <org>/<pipeline> --build <build-number> --state failed,broken --json
```

Fetch each failed job log in agent-friendly form:

```bash
bk job log <job-id> --agent --format markdown --max-tokens 4000
```

Use the job label, step key, command, exit status, and focused log window to identify the first actionable cause. Do not confuse downstream cancellations with root failures.

## Watch

```bash
bk build watch <build-number> --pipeline <org>/<pipeline>
```

Retry a failed job only when the user authorized retries and there is evidence of a flake:

```bash
bk job retry <job-id>
```
