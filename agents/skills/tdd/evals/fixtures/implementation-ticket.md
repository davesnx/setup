# Ticket: classify adult ages

Add an exported `isAdult(age)` function. It returns `true` for ages of 18 or
more and `false` for ages below 18. Reject negative ages with
`Error("age must be non-negative")`.

Use the public function as the test seam. The repository requires `npm test`
and `npm run typecheck` before review.
