# Failures

- Match the repository's established error model. Do not introduce a result
  framework into an exception-based codebase only to satisfy this skill.
- Make expected failures clear in the public contract through return values,
  declared errors, documented outcomes, or the repository's equivalent.
- Keep failure categories precise at module boundaries. Include useful context
  and an underlying cause without leaking sensitive data.
- Reserve panic-style failures for broken internal invariants and impossible
  states when that distinction matches the language and repository.
- Do not silence failures with ignored errors, broad catches, or fallback
  values that change meaning.
