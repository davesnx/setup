---
name: loop-on-ci
description: Use to inspect or debug CI, plan or fix failures, retry a job, or watch checks on a PR, branch, commit, or build. Supports GitHub Actions, Buildkite, and attached providers; each action needs its own authority.
---

# Loop On CI

Find checks, route them to the correct provider, and act only within the requested mode.

## Modes

- **Inspect and plan**: Use when the user asks to debug, inspect, summarize, or propose a plan. Diagnose failures, present the smallest fix plan, and wait for explicit approval before editing files.
- **Watch**: Observe current checks without edits, retries, commits, or pushes. A watch request, including "watch until green", does not authorize fixes or require push authorization.
- **Fix and loop**: A fix request authorizes focused local edits and checks, not publication or retries. An ambiguous "loop until green" request permits observation only until mutation authority is clear.
- **Retry**: Retry only when requested or separately approved and supported by flake evidence. Retry authority does not authorize edits or publication.
- **Publish**: Commit and push only when explicitly requested, after required local checks pass. Inspect, watch, fix, and retry authority do not imply publication authority.

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

### Watch

Record the target commit, build IDs, and current check set. Observe only that target; do not silently follow a new PR head or newer build. Use one total time limit across providers: the requested limit, or ten minutes by default. Do not restart an expired watch without a new request.

Poll immediately, then at short intervals (ten seconds by default). Each round rechecks target identity and fetches all recorded providers' build, job, and check states, including newly discovered checks for the same target. Recheck identity after those reads before accepting the round. A pending provider must not delay inspection of another provider. Run independent reads in parallel where supported; bound each round's reads by the shorter of the polling interval and remaining total time. Treat a read timeout as unavailable data, not a pending check. Use snapshot commands, not native blocking watches.

Stop when required checks pass, a terminal failure or blocked state needs action, access fails, the target changes, the user stops the watch, or the limit expires. Check for user stop and deadline before each round and wait; cancel active reads and waits when stopped. Do not start a final refresh after stop or deadline. Report the last observed states and their time, marking incomplete rounds and stale data. Report pending, cancelled, skipped, missing, or unavailable checks as such, not as green. Watching needs no push authorization and must not trigger a retry or fix.

### Fix And Loop

1. Apply one focused fix at a time.
2. Run the repository's relevant local checks.
3. If commit and push are authorized, publish the fix.
4. After an authorized push, resolve the new target and complete check set from every provider.
5. Observe pending builds within the Watch bounds above.
6. Repeat until all required checks pass or a concrete blocker prevents progress.

Without push authorization, stop the fix path after local verification and report that the local fix has not reached remote CI. This does not prevent a separately requested watch of existing checks. Retry a failed job only when authorized and supported by flake evidence.

## Guardrails

- Keep each fix scoped to one root cause when possible.
- Never bypass hooks or required checks.
- Do not add unrelated fixes for failures that already exist on the base branch.
- Retry an authorized suspected flake once, then report the evidence.
- Never treat an unavailable provider as green.
- Recheck all providers after every authorized push or retry.

## Output

- Status by provider
- Root failures and evidence
- Proposed plan or fixes applied
- Local checks run
- Retries and pushes performed
- Observed target, final check state, and stop reason with provider URLs; claim green only for verified required checks on that target
