# Blast Radius And Proof Lens

Find breakage that a symbol search alone will not reveal. Trace changed behavior through library semantics, pinned versions, local patches, async timing, teardown, configuration, APIs, database columns, schemas, wire formats, feature gates, generated artifacts, and consumers in other languages or packages.

## Safety Fact

Identify the one or two facts on which the change's safety depends. Test those facts instead of replacing evidence with a convincing writeup.

Use this proof ladder and report where each important fact stopped:

1. Claimed but unsupported.
2. Supported by a real source location or dependency source.
3. The failure path was traced and shown not to reach.
4. A focused script or test ran against the real code.
5. The behavior was reproduced in the running product.

Get material safety facts to level 4 when practical. Mark anything weaker as unproven.

## Process

1. State what behavior changed, including effects not obvious from the diff.
2. Identify the key safety fact.
3. Trace where grep stops and inspect the real boundaries and dependency behavior.
4. Rank each confirmed risk by realistic likelihood and impact.
5. Run the cheapest focused test, script, or product reproduction that can falsify the safety claim.
6. Separate confirmed risks from cases that were checked and cleared.

Do not invent callers, APIs, or failure paths. A search that finds nothing is evidence when the searched scope and pattern are stated.
