# Functions

- Show the happy path first. Guards leave early, the valid path stays flat and
  linear, and the common case gets most of the code a reader sees.
- A function should tell one story at one level of abstraction
- `let` bindings are sentences. Order them like you'd narrate them.
- The caller reads the headline; the callee owns the paragraph.
- Names explain what; the body should rarely need to explain how.
- Good code is boring to read — surprise is a code smell.
- Push side effects to the edges; keep the core pure
- Composition beats inheritance; functions compose better than objects.
- What you can't express as a value, you can't test.
- Make failure outcomes explicit using the repository's error model (see Failures).
