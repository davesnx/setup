---
name: technical-research
description: Gather and assess technical evidence from primary sources, produce cited findings, and resolve or report source conflicts. Use when the main task is research, fact verification, source comparison, or a cited research artifact, even if the findings will later support documentation. This skill is read-only apart from its research artifact unless the user explicitly asks for other changes. Do not use to turn settled facts into developer documentation, which belongs to technical-docs, or to write or analyze X posts, which belongs to x-writing.
metadata:
  source: "https://github.com/mattpocock/skills/blob/main/skills/engineering/research/SKILL.md"
---

# Technical research

Answer one technical question with evidence that another engineer can verify.

## Keep research read-only

Do not edit source code, configuration, documentation, tests, issues, commits, or pull requests. Write only the requested research artifact. If the user does not give an artifact path, use the repository's research-note convention or choose a clear Markdown path and report it.

Make other changes only when the user explicitly asks for them.

## Research process

1. State the question and the decision that the answer will support.
2. Read [references/research.md](references/research.md).
3. Find the source that owns each material fact.
4. Trace important secondary claims to their primary source.
5. Cross-check consequential claims when independent primary evidence exists.
6. Record source conflicts, uncertainty, version limits, date limits, and unanswered questions.
7. Write the cited research artifact before you give conclusions.
8. Verify that every material conclusion follows from its cited evidence.

For a large source set, divide independent source groups between read-only agents. Keep a source ledger and verify their citations before you accept their conclusions.

## Research artifact

Use the smallest structure that keeps the evidence clear:

```markdown
# Question

## Findings

## Source conflicts and limits

## Conclusion

## Sources
```

Cite material claims with a stable URL, repository path and line range, API response, paper section, or specification section. Put a citation next to the claim it supports. Distinguish direct evidence, inference, and unresolved uncertainty.

Do not turn the artifact into a tutorial, README, RFC, or X post. Those are separate deliverables owned by other skills.

## Provenance

See [UPSTREAM.md](UPSTREAM.md) for the integrated source and update record.
