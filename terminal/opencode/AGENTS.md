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

## Working Style

- Act without confirmation for normal work. Ask first when an action is
  destructive, irreversible, or when you are unsure between real options.
- Never revert user-authored changes unless the user asks.
- Never accept a snapshot or promoted diff you cannot explain.

## Eval Harness

- For OpenCode eval harness tasks, run `~/.config/opencode/eval-harness`
  directly. Do not load it into the user's interactive shell.

## Code

- Write comments only to explain why, never to restate what code does or to
  delimit sections.
- Fix root causes. Do not silence findings with casts, lint suppressions, or
  silent fallbacks.
- When a change alters behavior, update the docs that describe that behavior in
  the same change.
