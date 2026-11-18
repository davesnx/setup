---
name: mlx-syntax
description: Syntax guide for mlx, the JSX syntax for OCaml. Use when writing, reading, or reviewing a .mlx file, when the user asks for JSX or HTML-like elements in OCaml, or when a function must be callable as an mlx tag.
---

# Requisite

If the project has no mlx dialect yet, run the `setup-mlx` skill first.

# mlx syntax

mlx is a super-set of OCaml with html-like expressions added. Everything else is plain OCaml,
and a `.mlx` file can hold ordinary OCaml code. An element is an html-like expression:
bind it, return it from a match arm, put it in a list, or pass it as an
argument without parentheses

## Elements are function calls

`<div a=1>x</div>` calls the function `div` with `~a:1`, `~children:[x]`, and
a final `()`. A lowercase tag names a function in scope. An uppercase tag
names a module and calls its `createElement`; a runtime ppx may map that
call to `make`. In a module path the last segment decides: `<Ui.button />`
calls `Ui.button`, `<Ui.Button />` calls `Ui.Button.createElement`. A
self-closing tag passes `~children:[]`. The closing tag repeats the opening
name.

```ocaml
let page = <html><body><App title="Hi" /></body></html>
let items = [<li>"a"</li>; <li>"b"</li>]
let _ = render <App title="Hi" />
```

## Fragments

`<>a b</>` groups children without a wrapper element. It is the list of its
children with a `[@JSX]` attribute, `[a; b] [@JSX]`. A runtime ppx gives it a
meaning: `reason-react` turns it into a `React.Fragment`.

```ocaml
let both = <><Header /><Footer /></>
```

## Props

`name=value` passes `~name:value`. A bare `name` puns `~name:name`. `?name`
passes an optional argument through, and `?name=value` passes `?name:value`.

```ocaml
<input value ?placeholder disabled=(not editable) onChange=(fun e -> set e) />
```

## OCaml keywords as prop names

OCaml keywords are not prop names: `class`, `type`, `method`, `open` are syntax errors. Use the trailing-underscore label the component defines, such as `class_`.

## Children

Children are simple expressions separated by whitespace: literals,
identifiers, field access, parenthesized expressions, and elements. They
arrive as one list in `~children`. A string literal is a plain `string`; the
runtime decides how it renders.

```ocaml
<div>
  "Total: " (string_of_int total)
  <span class_="hint">hint</span>
</div>
```

## Component signature

A function is callable as a tag when its props are labeled arguments, it
takes `~children` or `?children`, and it ends with `unit`. Declare
`~children` on a leaf component too: every call passes it. An uppercase tag
needs a module whose `createElement` has the same shape.

```ocaml
let leaf ~title ~children () = ...
let button ?(kind = `Primary) ~children () = ...

module Card = struct
  let createElement ~title ~children () = ...
end

let _ = <Card title="t"><leaf title="x" /><button kind=`Danger>"Save"</button></Card>
```

## Parenthesize compound expressions

A prop value or a child must be a simple expression. Wrap `if`, `match`,
`fun`, `let`, infix operators, negative numbers, and applications with
arguments in parentheses. Braces are an OCaml record literal, so `{x}` is a
record, not interpolation.

```ocaml
(* wrong: syntax error *)
<div count=-1 onClick=fun _ -> go ()> if ok then a else b </div>

(* right *)
<div count=(-1) onClick=(fun _ -> go ())> (if ok then a else b) </div>
```

An application without parentheses is not a syntax error. mlx splits it, and
the type error points somewhere else.

```ocaml
<div>string_of_int n</div>     (* two children: string_of_int and n *)
<row gap=to_gap size />        (* two props: ~gap:to_gap and ~size *)

<div>(string_of_int n)</div>
<row gap=(to_gap size) />
```

## Children spread

`<Foo>...xs</Foo>` passes `xs` as `~children:xs`, not wrapped in a list. The
spread must be the only child. `<>...xs</>` is `xs [@JSX]`.

## Known limits

- Props spread `...props` does not exist.
- A fragment passed as a function argument needs parentheses, `f (<>a</>)`.
  An element does not, `f <a />`.
- `<` followed directly by a name starts a tag. Write a comparison with
  spaces, `a < b`. `a<b` is a syntax error.
- `<>` and `</>` are still operators. Inside a fragment, parenthesize them:
  `<>(a </> b)</>`.
- Comments `(* ... *)` are allowed between props and between children.
