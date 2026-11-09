---
name: melange-advanced
description: How Melange compiles OCaml and Reason values to JavaScript, and what that means for value identity. Use when reviewing or writing React hook dependency arrays (useMemo, useEffect, useCallback) in Melange code, when a dep is an option, variant, record, tuple, list, or int64, when a hook refires or a fetch loops on every render, or when reading Melange-generated JS.
---

# Melange runtime representation

React compares hook deps with `Object.is`. A Melange value keeps its identity across renders only when its JS form is a primitive, or when the same reference flows through. Find the JS form of every dep before you judge a dependency array.

## Representation table

Checked with melc (Melange 5.x on OCaml 5.5):

| OCaml / Reason value | JS form | Stable by value |
| --- | --- | --- |
| `int`, `float`, `string`, `bool` | primitive | yes |
| `unit` | `undefined` | yes |
| `None` | `undefined` | yes |
| `Some(x)`, `x` not an option | `x` itself, no box | same as `x` |
| `Some(None)`, `Some(())` | `Caml_option.some(...)`, a fresh box | no |
| constant constructor `A` | int tag (`0`), or the `[@mel.as]` string | yes |
| constructor with args `Q("s", 1)` | `{TAG: 1, _0: "s", _1: 1}` | no |
| `[@@unboxed]` single constructor `U(3)` | the payload, `3` | same as payload |
| constant poly variant `` `Foo`` | string `"Foo"` | yes |
| poly variant with arg `` `Foo(3)`` | `{NAME: "Foo", VAL: 3}` | no |
| record | object with field names | no |
| tuple | array | no |
| list | `{hd, tl}` chain, `[]` is `0` | no |
| `int64` | `Caml_int64` two-int array | no |

"No" means every evaluation of the expression allocates a new object. A literal bound once at module level (a `default` filter value) is one object for the whole run, so it looks stable in tests while a parsed value is not.

## The fresh-allocation trap

A structured value rebuilt each render (parsed from the URL, built inline in JSX, a partially applied callback) is a fresh allocation on every render. As a dep, it fires the hook every render. When the hook result feeds another hook that fetches and dispatches, the page loops.

Fix it in this order:

1. Memoize at the source, so the same reference flows to every consumer: `React.useMemo1(() => Filter.fromQuery(~query), [|query|])`.
2. If the source is out of reach, key the dep on a primitive projection: `[|value->Option.mapWithDefault("", valueToString)|]`. The rules-of-hooks ppx sees the projection, not the value the callback reads, so keep `[@disable_exhaustive_deps]` on the hook.
3. For a mount-only effect that reads props, use `useEffect0` with `[@disable_exhaustive_deps]`. A `useRef` snapshot of the props hides the same choice from the ppx and reads worse.

## Check the JS yourself

When a type is not in the table, or the project pins a different Melange, compile a scratch file and read the output:

```bash
melc -nostdlib -I <melange>/_build/default/jscomp/stdlib/.stdlib.objs/melange -I <melange>/_build/default/jscomp/runtime/.melange_runtime.objs/melange scratch.ml -o scratch.js
```

In a dune project, put the scratch module in a `melange.emit` target and read the file under `_build/default/<target>/`.
