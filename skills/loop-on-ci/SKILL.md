---
name: loop-on-ci
description: Inspect, plan, fix, and monitor failing CI across GitHub Actions, Buildkite, and other attached providers. Use when a user asks to debug CI, summarize a red build or PR, propose a CI fix plan, fix failing checks, retry a flaky job, or watch checks until they pass. Accepts a PR, branch, commit, build URL, or provider-specific build identifier.
---

# Loop On CI

Find failing checks, route them to the correct provider, diagnose root causes from logs, and either stop for plan approval or apply focused fixes until every required provider is green.

## Modes

- **Inspect and plan**: Use when the user asks to debug, inspect, summarize, or propose a plan. Diagnose failures, present the smallest fix plan, and wait for explicit approval before editing files.
- **Fix and loop**: Use when the user asks to fix, retry, loop, watch, or continue until green. Apply focused edits and keep checking until green or blocked. Commit and push only when explicitly requested.

## 1. Resolve The Target

Accept a PR number or URL, branch, commit, Buildkite URL, pipeline and build number, or the current branch by default.

For a pull request, inspect all attached checks before choosing adapters. A single PR can use GitHub Actions, Buildkite, and other providers at the same time. Classify providers from check links and workflow metadata.

For a branch or commit without a PR, use repository CI configuration and explicit user context to identify providers. Do not guess a provider from a generic failure message.

## 2. Load Provider Adapters

- Read [references/github-actions.md](references/github-actions.md) for GitHub PR checks and GitHub Actions logs.
- Read [references/buildkite.md](references/buildkite.md) for Buildkite builds, jobs, logs, retries, and watches.
- For an unsupported provider, report its check name and details URL. State that no adapter is installed instead of pretending the logs were inspected.

Verify each required CLI and its authentication before starting. Do not handle credentials or print tokens.

## 3. Inspect Before Waiting

Fetch the current state from every attached provider. Separate:

- actionable failed or broken jobs
- downstream cancellations caused by an earlier failure
- pending or running jobs
- skipped or intentionally blocked jobs
- unreachable provider logs

For each actionable failure, collect the check, build, job or step, URL, exit status, and the smallest log window that contains the first useful cause. Call out missing logs rather than guessing.

## 4. Diagnose

Trace failures to the changed code, configuration, environment, dependency, test, or infrastructure condition that caused them. Check whether the same failure exists on the base branch before adding unrelated fixes to a PR.

Summarize each root cause with evidence. Treat repeated symptoms from one cause as one finding.

## 5. Follow The Mode

### Inspect And Plan

Present the current provider status, root causes, and smallest fix plan. Wait for approval. After approval, apply the plan, run relevant local checks, and report which remote checks require a push or retry.

### Fix And Loop

1. Apply one focused fix at a time.
2. Run the repository's relevant local checks.
3. If commit and push are authorized, publish the fix.
4. Re-fetch the complete check set from every provider; the set can change after a push.
5. Watch pending builds with each provider's native watch command.
6. Repeat until all required checks pass or a concrete blocker prevents progress.

Without push authorization, stop after local verification and explain that remote CI cannot rerun. Retry a failed job only when authorized and supported by flake evidence.

## Guardrails

- Keep each fix scoped to one root cause when possible.
- Never bypass hooks or required checks.
- Do not add unrelated fixes for failures that already exist on the base branch.
- Retry a suspected flake once, then report the evidence.
- Never treat an unavailable provider as green.
- Recheck all providers after every authorized push or retry.

## Output

- Status by provider
- Root failures and evidence
- Proposed plan or fixes applied
- Local checks run
- Retries and pushes performed
- Final green state or exact blocker with provider URLs
