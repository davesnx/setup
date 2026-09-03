---
name: simplify
description: Apply simplicity standards to all software engineering work. Use for every request to write, change, fix, refactor, review, simplify, or clean up code, including AI-generated code, reuse, quality, and efficiency work, and when choosing APIs, architecture, dependencies, tests, errors, state models, or operational behavior. Produces the least complex clear solution that meets the full contract.
---

# Simplify

Build the least complex clear solution that fully meets the contract. Guide the
design from the start. Inspect the final diff, but do not add a separate cleanup
pass that creates churn.

## Route

When another skill owns the process or edit boundary, Simplify supplies design
rules while the owning skill controls sequence, checkpoints, edits, and output.

- **Write or change code:** Use the workflow and ladder below.
- **Simplify or clean up existing code:** Also read
  [references/simplify-existing.md](references/simplify-existing.md).
- **Prose cleanup with no source code:** Use Unslop instead.
- **Review-only work:** Apply these rules as a simplicity lens, preserve the
  read-only boundary, and leave the parent review workflow in control.
- **Boundary, integration, persistence, input parsing, configuration, resource,
  observability, sensitive-data, module, state, failure, test, retry,
  transaction, or durable-workflow work:** Also read
  [references/standards.md](references/standards.md).

## Workflow

### 1. Set the contract

Identify the requested outcome, required behavior, public contracts, safety
conditions, and repository checks. For existing code, record what must remain
unchanged. For a bug, distinguish the reported symptom from the expected
behavior.

Complete when every requested outcome and protected invariant has a clear,
checkable statement.

### 2. Trace the real path

Read the target code, callers, callees, tests, nearby conventions, and existing
helpers before choosing a design. For a bug, inspect all callers and sibling
paths that can reach the same cause.

Complete when ownership, affected callers, existing reuse options, and relevant
tests are known for every symbol that may change.

### 3. Stop at the first rung that holds

Use this order:

1. **Need:** Existing behavior already meets the outcome, so no implementation
   is needed.
2. **Delete or reuse:** Remove obsolete code or use the repository's canonical
   implementation.
3. **Language or standard library:** Use a built-in feature.
4. **Native platform:** Use the database, browser, runtime, operating system, or
   framework feature that already owns the job.
5. **Installed dependency:** Use an established dependency when it is the
   project's normal path.
6. **Direct local code:** Write the small, clear implementation.
7. **New abstraction or dependency:** Add one when it removes more owned
   complexity than it adds and fits the repository.

Stop only when the chosen rung meets the full contract. If two choices work,
prefer the one with fewer owned concepts and safer edge behavior. Simplicity is
not line-count golf.

### 4. Implement the complete solution

Fix root causes at the shared owner rather than patching each symptom. Keep the
change in the fewest responsible files.

Complete when the requested behavior works without speculative code, duplicate
paths, or an unexplained new concept.

### 5. Check the final diff

Remove dead code, repeated work, pass-through wrappers, stale comments, and
temporary scaffolding left by the implementation. Keep necessary validation,
error handling, security, accessibility, diagnostics, and compatibility.

Complete when every remaining changed line serves the contract, safety, or
clarity.

### 6. Verify

Run the repository-defined format, lint, type checks, build, and relevant tests
after the final edit. Use existing test style and real seams. Fix failures caused
by the change and rerun affected checks.

Complete when all required checks pass, or the exact blocker and its evidence
are reported.

### 7. Report plainly

State what changed, what complexity was avoided or removed, and which checks
ran. Stop using jargon and speak coherently. State it more simply and
concisely, like one human talking to another.

Complete when every claim has evidence and the report contains no unsupported
success statement.

## Rules

The Code section of the global agent rules applies here and is not repeated
below.

- Correctness, safety, and the ability to diagnose failures outrank brevity.
- Keep one-use behavior direct until a real second use, owner, or implementation
  proves that an interface, factory, option, or wrapper earns its cost.
- Split code for distinct ownership or reasons to change, not arbitrary file
  size or a preferred layer count.
- Choose a safe simple default when requirements permit one. Name the condition
  that would justify a more complex version.
- Keep input validation at trust boundaries, data-loss protection, security,
  accessibility, observability, and explicitly requested behavior.
- Use repository conventions when they are compatible with the contract. Keep
  unrelated old code unchanged and contain incompatible legacy patterns at the
  nearest boundary.
- Use concrete names and one term per concept. Improve new and private names
  automatically. Rename a public API only when the user asks for the migration.
- Use plain, coherent language in names and comments. Prefer a concrete purpose,
  fact, or instruction over abstract jargon.
