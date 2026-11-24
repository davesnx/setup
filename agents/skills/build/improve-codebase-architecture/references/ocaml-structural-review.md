# OCaml Structural Review

Apply this lens during a read-only architecture audit of OCaml or Melange code. It is a review method, not an OCaml analyzer. Inspect `.mli` signatures, `.ml` implementations, actual callers, and the build layout together; an absent `.mli` means the inferred interface also matters. For `.mlx`, inspect the same module boundaries without assuming a Rust tool can parse it.

The goal is a deeper module: callers learn less and maintain fewer rules. Do not transplant `deslop-please` diagnostics or numeric cutoffs into OCaml. That executable uses Rust tooling; this reference does not claim OCaml or Melange support. A typed `.cmt`/`.cmti` analyzer is separate future work.

## Follow the burden

1. Identify the public operation or invariant and the callers that use it. Cite both the signature (or inferred export) and representative caller lines.
2. Ask what each caller must know: representation, valid update order, ownership of a decision, or just a stable value. A public field alone is not evidence.
3. Sketch a smaller boundary that performs the work. Name the concrete caller steps it removes, the dependency direction after the change, and behavior to preserve.
4. Reject a proposed fix if it only changes spelling or location. A getter returning a mutable field, a thin wrapper that forwards the same operation, a reexport, or a file move leaves the burden intact.
5. Report only reachable costs with evidence and a plausible improvement. Apply the audit's existing finding format and read-only source rule; do not implement the fix during the audit.

## Four questions

| Signal | Check against callers | Worth reporting when |
| --- | --- | --- |
| Field leak | Does a caller write, index, or coordinate fields to keep a representation valid? Does a getter hand out the same mutable structure? | A semantic operation can own the invariant and remove caller steps. Reading a public immutable data record is not a leak. |
| Shallow module | What does the `.mli` expose, and which exports do outside callers actually use? How much policy or work stays inside? | A coherent smaller operation can replace a set of caller-owned steps. A wide but coherent API, a functor interface, or many exports alone are not findings. |
| Tangle | Do two responsibilities repeatedly make each other's decisions, even if dependencies compile in one direction? | A split puts coordination at a clear owner and removes knowledge crossing the boundary. Legitimate mutually recursive definitions are not a tangle by themselves. |
| Cycle | Which actual module uses which other module for what? Separate subsystem direction from `.ml`/`.mli` compilation order. | A real dependency or ownership loop has a concrete cost and an end state with clearer direction. A compile-order edge, alias, `include`, or apparent file-level circle alone is not proof. |

Counts of fields, exports, files, or edges are search hints, never rules. Check constraints such as stable public APIs, functor type equalities, and documented module intent before proposing abstraction.

## Examples

**Positive — caller maintains a queue invariant.** The signature exposes the representation:

```ocaml
module Queue : sig
  type t = { mutable head : int; items : string array; mutable size : int }
  val create : int -> t
end
```

```ocaml
let enqueue (queue : Queue.t) item =
  let slot = (queue.head + queue.size) mod Array.length queue.items in
  queue.items.(slot) <- item;
  queue.size <- queue.size + 1
```

If `enqueue` is a caller outside `Queue`, it knows both the slot calculation and the update order. Inspect the real implementation and other callers, then propose a `Queue.enqueue` that checks capacity and maintains `size` itself, with `t` abstract only if its consumers do not need a concrete representation. Cite the actual sites and show which caller operations disappear.

**Negative — data is the interface.** This is not a field leak:

```ocaml
type summary = { completed : int; failed : int }
type result = Accepted of summary | Rejected of string
let label = function
  | Accepted { completed; failed } -> string_of_int (completed + failed)
  | Rejected reason -> reason
```

Callers read an immutable snapshot and match a public result variant; they do not keep hidden state valid. Similarly, a wide `.mli` can be one coherent protocol. A functor, alias, `include`, or `let rec ... and ...` is not a defect without a caller burden.

**Cosmetic fix — same knowledge through a getter.** This does not solve the positive example:

Signature:

```ocaml
module Queue : sig
  type t
  val head : t -> int
  val items : t -> string array
  val size : t -> int
  val set_size : t -> int -> unit
end
```

Caller:

```ocaml
let enqueue (queue : Queue.t) item =
  let slot = (Queue.head queue + Queue.size queue) mod Array.length (Queue.items queue) in
  (Queue.items queue).(slot) <- item;
  Queue.set_size queue (Queue.size queue + 1)
```

The caller still computes the slot and coordinates writes. Moving this code to a new file or reexporting it under another module name also leaves the dependency and invariant ownership unchanged. Prefer the semantic operation only if it removes that work.

## Sources

- [OCaml 5.4 manual, module system](https://ocaml.org/manual/5.4/moduleexamples.html): signatures can hide representations and protect invariants; functors, `include`, and compilation units have distinct roles.
- [`deslop-please` README, structural review guidance](https://github.com/deterministic-machines/deslop-please/blob/f678d10d6e6860e70900ceae919e2d769b0a11ae/README.md#L42-L49) and [end-to-end tests](https://github.com/deterministic-machines/deslop-please/blob/f678d10d6e6860e70900ceae919e2d769b0a11ae/tests/end_to_end.rs#L150-L224): first-principles fixes differ from getters, relays, and reexports. Its [`field-leak`](https://github.com/deterministic-machines/deslop-please/blob/f678d10d6e6860e70900ceae919e2d769b0a11ae/src/lint/leaks.rs) and [`shallow-module`](https://github.com/deterministic-machines/deslop-please/blob/f678d10d6e6860e70900ceae919e2d769b0a11ae/src/lint/shallow.rs) checks are Rust-specific inspiration, not OCaml rules.
