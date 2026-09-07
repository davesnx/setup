---
name: setup-mlx
description: Install and configure mlx, the JSX syntax for OCaml, in a dune project. Use when the user asks to set up, enable, or add mlx or JSX to an OCaml project, when a .mlx file exists but dune-project has no mlx dialect, or when mlx-pp, ocamlmerlin-mlx, or ocamlformat-mlx is missing.
---

# Setup mlx

mlx adds JSX expressions to OCaml. Three tools take part: `mlx-pp` (package `mlx`),
`ocamlmerlin-mlx` (Merlin reader, gives editors diagnostics and completion),
and `ocamlformat-mlx` (formatter). To write mlx code, use the `mlx-syntax` skill.

Work from the project root, the directory that holds `dune-project`.

## 1. Pick the package manager

- `dune.lock/` exists, or `dune-workspace` contains `(pkg enabled)`: dune
  package management.
- `_opam` exists, or confirm a switch is active with `opam switch show`: use opam.

## 2. Install the tools

opam:

```sh
opam install mlx ocamlmerlin-mlx ocamlformat-mlx
```

Dune package management: add `mlx`, `ocamlmerlin-mlx`, and `ocamlformat-mlx`
to `(depends ...)` in the `(package ...)` stanza of `dune-project`, then run
`dune pkg lock`. Dune's dev-tools list does not include these packages, so
they must be regular dependencies.

Done when `command -v mlx-pp ocamlmerlin-mlx ocamlformat-mlx` prints three
paths (opam), or the lock solution lists all three packages (dune).

## 3. Declare the dialect

Look for `(dialect` with `(name mlx)` in `dune-project`. If absent, append:

```lisp
(dialect
 (name mlx)
 (implementation
  (extension mlx)
  (merlin_reader mlx)
  (format
   (run ocamlformat-mlx %{input-file}))
  (preprocess
   (run mlx-pp %{input-file}))))
```

`merlin_reader` needs `(lang dune 3.16)` or newer. If the project declares an
older version, raise it and tell the user, because a lang bump can change
other dune defaults. Keep `(merlin_reader mlx)` as written: Merlin resolves
the name to the `ocamlmerlin-mlx` binary itself.

Once declared, dune treats `.mlx` files as modules. `dune` files need no
change.

## 4. Formatting

`dune fmt` formats `.mlx` files through the `format` action above.
`ocamlformat-mlx` skips every file with a warning when the project root has
no `.ocamlformat`. If none exists, create one with
`version = <output of ocamlformat --version>`. If one exists for plain
`ocamlformat`, keep both binaries on the same base version: `version =
0.29.0` accepts `ocamlformat-mlx` `0.29.0.1`.

## 5. Check ocaml-lsp-server

```sh
ocamllsp --version
```

Release 1.25.0 added `.mlx` support. If the version is lower or the binary is
missing, run `opam install "ocaml-lsp-server>=1.25.0"` under opam, or
`dune tools exec ocamllsp` under dune package management, which installs the
current release. Editor plugins: VS Code OCaml Platform 2.0.0 or newer,
`ocaml_mlx.nvim` for Neovim, `emacs-mlx` for Emacs.

## 6. Verify

```sh
dune build
dune ocaml merlin dump-config . | grep READER
```

Done when the build passes and every `.mlx` module shows `(READER (mlx))`.
With no `.mlx` file in the project yet, the grep prints nothing; skip it.

Report what was installed, the stanza added, any `lang dune` bump, and the
`ocamllsp` version.
