# Analysis of Recent User Prompts

## Global Communication Requirement

- Always use ASD-STE100 Simplified Technical English when communicating with the user.

## Green Build Gate

- Before every `git commit`, load and follow the `commit` skill.
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

## Observed Preferences

### Code Quality
User prefers explicit references and comprehensible code in React projects, avoiding implicit references to enhance clarity.
- **Confidence:** 0.5
- **Example Prompts:**
  - "Can you clarify the context around the rendering functions?"
  - "I prefer explicit dependencies in useMemo and useCallback."

### Communication Style
User emphasizes clear communication in updates, especially related to technical explanations and PR management. Clarity in plans and outcomes is crucial.
- **Confidence:** 0.4
- **Example Prompts:**
  - "Ensure the updates are clear before we proceed."
  - "Make sure to summarize the findings in our next session."

## Observed Patterns

### Debugging and Testing
User consistently demonstrates a structured approach towards debugging within React applications and in CI. They have a well-defined workflow to handle issues and measure fixes.
- **Frequency:** 7/10

### React Development
User is deeply engaged in optimizing React performance, focusing on the interference of certain patterns like useEffect and rendering strategies.
- **Frequency:** 8/10

### Pull Request Management
User follows a disciplined workflow for managing pull requests, addressing conflicts promptly, and ensuring clarity in descriptions.
- **Frequency:** 6/10

## New Workflows
- **Benchmark Implementation Workflow**: This reflects user steps: Measure performance → Identify bottlenecks → Optimize code structure and dependencies. Includes phases of analysis and implementation.

### Steps:
1. Measure application performance using profiling tools.
2. Identify areas for optimization constrained by LCP and allocation testing.
3. Implement adjustments and verify through testing outputs.
4. Document progress and consolidate findings for review.

### Contribution to Existing Workflows
This new workflow effectively feeds into user's existing Debugging Workflow maintaining coherence in project management while making steps clear.

## Summary of Changes in User Profile
- Added new observations to the preferences ensuring clarity in communication and explicit coding practices.
- Integrated the emerging Benchmark Implementation Workflow as a structured step sequence from current performance optimization goals.

---
