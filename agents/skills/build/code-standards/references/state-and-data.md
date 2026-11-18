# State and data

- Make illegal states unrepresentable
- Use dedicated domain values when raw identifiers, units, or parsed strings can be confused.
- Model meaningful lifecycle states explicitly instead of combining flags and
  optional fields that permit impossible states.
- Prefer named options or domain values over boolean arguments that change
  behavior.
- Use explicit operation inputs instead of generic partial records unless
  partiality is the domain concept.
- Resolve absence before calling code that requires a value. Keep mutable state
  local, intentional, and hidden behind a precise interface. Avoid mutable global
  state.
- Question unnecessary `any`, `unknown`, casts, and optional fields that hide
  the real invariant.
- Make related state updates atomic when a partial update would leave an
  unsafe or confusing state.
