# Check the writing eval contracts

For maintainers checking the blog-post and post-draft evaluation cases.

Run the shared regression checks from the repository root after installing the
existing eval-harness dependencies:

```sh
node --test agents/skills/blog-post/evals/regression.test.cjs
```

If those dependencies are absent and Ruby/Psych is installed, use the explicit
offline parser option:

```sh
EVAL_YAML_PARSER=ruby node --test agents/skills/blog-post/evals/regression.test.cjs
```

The tests execute the shell graders from the actual YAML against disposable
good and bad outputs. They do not invoke a model.

## Blog review

`direct-complete-review` requires `review.md` itself to contain a JSON object.
Returning JSON only in chat does not satisfy the case.

Each finding contains `source_quote` and `observation`. The checker verifies
that the quote occurs in the unchanged draft, both fields are nonblank, no
blocking interview questions were added, and the source draft was preserved.

It rejects uncited findings and invented quotes. It cannot establish that an
observation follows from the quote. A nonsensical observation attached to a real
quote is a tested limitation; review relevance and usefulness separately.

## Post-draft evidence

Both post-draft cases use the same `progress.md` contract:

- `evidence_source`, `answered_interview_rounds`, and `status`.
- `added_passages`: one record for every new prose paragraph, with its text and
  exact source sentences.
- `cold_start_claims`: the existing claim records with subject, measurement
  status, value, and source evidence.

`source-resolved-gaps` records zero answered rounds. The answered-round case
records one. The original fixture has no prose beyond its protected maintenance
note, so the grader can check complete coverage of the newly written paragraphs.
The YAML prompt defines the paragraph/whitespace rule used by the checker.

Missing, duplicate, unwritten, or uncited paragraph records fail. Source-note
changes and unsupported declared measurements also fail. Complete records do
not prove correct attribution: a passage can still misrepresent a genuine quote,
or omit a cold-start classification while recording the paragraph. Those checks
remain part of qualitative review.

## Verification record

On September 16, 2026, the uncited-finding and omitted-paragraph regression tests
both failed against isolated pre-fix case definitions. All 12 shared tests then
passed against the corrected cases using the Ruby parser option.

Four focused OpenCode attempts also passed the revised automatic contracts:
blog-post and post-draft each ran once against both skill revisions from the
a3863a3 study. The new runner kept their assessment at `needs_review`.
These runs establish contract execution, not general writing quality.
