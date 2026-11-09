# Tests

- Prefer confidence in this order when practical: tests through real public
  entrypoints, integration tests through real seams, property tests for pure
  rules, then focused unit tests.
- Do not add logic in tests.
- Test observable behavior such as returned outcomes, stored state, emitted
  messages, rendered responses, or recorded external actions.
- Prefer real seams, local substitutes, or explicit fake integrations over
  module mocks and tests driven mainly by spies.
- Use a real local database when schema, query, or transaction behavior matters.
- Construct test data through the same valid paths used by production code.
- Follow the repository's test tools and conventions. Add the smallest test set
  that proves the changed behavior and important edge cases.
