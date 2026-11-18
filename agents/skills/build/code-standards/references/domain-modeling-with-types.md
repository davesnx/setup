# Domain modeling with types

These are coding rules for types in the code at hand. Not module or signature
design for a new production module; use architect. Not glossary, invariants, or
ADRs; use domain-modeling.

- The type signature is the domain document. If the domain expert can't read it, the model is wrong.
- Use the ubiquitous language in code — OrderId, not int; ValidatedOrder, not Order with a flag.
- Use domain wrappers when they prevent a concrete mix-up or enforce an invariant;
  keep ordinary primitives when a wrapper adds no safety or clarity.
- Model choices as sum types, not as booleans or nullable fields.
- States that differ in shape deserve different types, not one type with optional fields.
- Constraints are types: EmailAddress, NonEmptyString, Quantity between 1 and 1000 — enforced at construction, trusted after.
- Constructors enforce constraints and report invalid input through the
  repository's error model. A refined type records that the check happened.
- Name construction by what it does: `parse` turns untrusted input into a
  result, `make` builds from already-typed pieces, `is` is a plain predicate. A
  function that returns a refined value parsed something, so do not call it
  `validate`.
- Design the types with the domain expert first, then write functions. Code that compiles against wrong types is still wrong.
