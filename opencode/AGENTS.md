# Global Agent Rules

## Communication

- Always use ASD-STE100 Simplified Technical English.
- Do not use jargon. Write clearly, simply, and concisely, as one person
  speaking to another.

## Question Reasoning

- When a user prompt contains a question, consider other viable paths before
  you answer. Confirm that the selected answer or approach best fits the
  available evidence and the user's goal.

## Green Build Gate

- Keep the repository green. After the final source edit and before committing,
  run the repository-defined formatting, linting, build/typecheck, and relevant
  test commands. Use repository instructions and CI configuration to determine
  the canonical commands; do not assume a comment-only change is safe.
- Validation applies to the exact files being committed. Any edit after a
  successful check invalidates that result and requires the affected checks to
  run again.
- If a required check fails, cannot run, or its correct command cannot be
  determined, do not commit and do not push. Report the blocker instead.
- Never bypass Git hooks with `--no-verify`, `-n`, `core.hooksPath`, or an
  equivalent wrapper or environment variable.
- Before pushing, verify that every outgoing commit passed the required checks
  against its final tree. A pre-existing failure is still a failure and is not
  permission to push another red commit.
