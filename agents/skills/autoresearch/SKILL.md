---
name: autoresearch
description: Run bounded, measured experiments when the user explicitly requests autoresearch or optimization of a metric.
disable-model-invocation: true
argument-hint: "<metric or target> [constraints]"
---

# Autoresearch

Improve a declared metric through bounded experiments without breaking required
behavior. Choose the smallest experiment that can resolve the current hypothesis.

## Measured loop

1. Establish the workload, benchmark command, metric and direction, correctness
   checks, files in scope, constraints, and stop budget. Infer these from the
   request and repository; ask only about material gaps. Reuse existing commands.
2. Measure the baseline. Repeat noisy measurements under comparable conditions;
   an apparent gain within measurement noise needs confirmation.
3. Choose an evidence-backed hypothesis. Change only what tests that hypothesis,
   then run the benchmark and correctness checks. Failed checks reject a gain.
4. Record the candidate, measurements, check results, and decision. Keep a change
   only after confirming improvement against the current best. Preserve enough
   evidence to explain rejected attempts and reproduce the comparison.
5. Continue until the target, budget, plateau, lack of viable hypotheses, or user
   stop request ends the run. Verify the best final state and report the change,
   evidence, tradeoffs, and stop reason.

Work sequentially by default. Use independent candidates or workers when they
offer useful alternatives or the user requests them. Parallel implementation does
not justify simultaneous measurements that compete for resources. Generate as
many hypotheses as the evidence supports; do not fill a quota.

Unless the user sets limits, stop at 30 experiments, three consecutive rounds
without improvement, or two hours, whichever comes first. One sequential
experiment is one round. Do not ask to continue within the agreed budget.

## Choose the workflow

A bounded single-session task can use an existing benchmark, a reversible patch,
and one concise results record. It does not require a setup commit, worker agents,
dashboard, or a second worklog. Keep the baseline recoverable and identify each
candidate by its diff or revision. Isolate concurrent work and preserve unrelated
changes; use a separate worktree when the checkout is dirty or shared.

For a resumable campaign, or when candidates need coordinated isolation, use the
existing campaign workflow. Read only the reference needed for the current step:

- [Setup](references/setup.md): campaign definition, isolated branch, and benchmark
  wrappers when existing commands need adaptation.
- [Execution](references/execution.md): candidate batches, winner selection,
  combination tests, and cleanup.
- [State](references/state.md): the campaign's authoritative JSONL record and
  verified atomic writes.
- [Recovery](references/recovery.md): resume a campaign or resolve missing or
  conflicting records before new experiments.
- [Dashboard](references/dashboard.md): generate a requested report or use an
  overview when the results have become hard to inspect directly.

Keep correctness checks separate from the metric when optimizing it could break
required behavior. Existing checks are sufficient; create a wrapper only when it
makes repeated execution reliable. Git writes, installs, and publication still
require their normal authority and checks. An optimization request alone does not
authorize a commit. On a stop request, start no pending candidates, preserve
completed evidence, and report any active work.

## Skill Checks

Run `python3 -B agents/skills/autoresearch/tests/test_examples.py` from the repository root to test the documented check gate, reference links, and shell syntax without running real experiments.
