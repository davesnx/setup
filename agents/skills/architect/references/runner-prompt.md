# Architect runner prompt

Use only for a runner selected by the optional comparison workflow. Supply the
task, grounding evidence, shared acceptance criteria, and the runner's distinct
design constraint. Return the sketch in the response unless a separate output
path is supplied.

Produce one candidate under the [Architect design discipline](../SKILL.md#design-discipline).
Work read-only on source and perform no Git write operations. Return your candidate
to the coordinator; do not start another comparison or spawn more runners.

Show caller usage, types, signatures, important constraints, and tradeoffs. Add a
module map only if it clarifies the shape. Use
[rationale-template.md](rationale-template.md) only for sections this candidate needs.

Develop the assigned shape against the evidence. Explain where it fits and where
it fails; the coordinator needs a concrete comparison, not artificial agreement.
