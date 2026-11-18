# Authoring

Use this reference when creating or editing a skill. For a clear request, edit
directly. Research or ask questions only where the task, trigger boundary,
inputs, outputs, dependencies, or success criteria remain unclear.

## Structure

```text
skill-name/
  SKILL.md       # Required: frontmatter and shared workflow
  scripts/       # Repeatable executable work
  references/    # Conditional instructions and reference material
  assets/        # Templates, icons, and other output resources
```

- `name`: stable skill identifier matching the directory name.
- `description`: a short task trigger. State what request selects this skill
  and any nearby task it must exclude. Avoid lists of topic keywords or claims
  that a particular model needs forceful wording.
- `compatibility`: optional required tools or dependencies; include only when
  needed. Check host-specific fields in the host's documentation. If available,
  the `writing-for-agents` skill also provides a Skill mechanics reference.
- Body: shared steps, completion criteria, and links with explicit conditions.

Metadata is supplied for discovery; the body is loaded on invocation; reference
files are read when needed. Exact host behavior differs. Keep the root small
enough to scan rather than filling a line budget. Move variant-specific detail
behind named links, and add a contents list to references longer than 300 lines.
For multiple frameworks, keep shared selection in the root and give each
framework its own reference. Scripts can run without loading their source.

## Instructions and formats

Use direct instructions. Explain a reason when it prevents a likely mistake.
Preserve explicit requirements and permission boundaries. For additional wording
and conditional-loading guidance, use the host's skill lookup to load
`writing-for-agents` by name, then resolve its references from its installed
location. If unavailable, continue with this document and the host's documented
controls. Report unverified host behavior rather than inventing it. Do not assume
a sibling directory or copy another skill into this one.

When the output has a required format, state its exact fields or template.
For example, a report may require `Summary`, `Findings`, and `Recommendations`
headings in that order. Include a short input/output example when it resolves
ambiguity, such as a commit-message example:

```text
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

Reuse proven helpers. Bundle a script only when repeated execution shows a
shared need; do not turn a one-off workaround into a general requirement.
Remove unused instructions, not operational knowledge.

If output quality needs testing, continue to [Evaluation](evaluation.md).
Use objective checks for verifiable results and human review for subjective
qualities. A narrow documentation edit need not start a full evaluation loop.
