# OCaml Public API And Semver

Use when the diff touches a library with a dune `public_name`, an `.opam`
file, `dune-project` dependencies, a ppx, or a `melange.emit` target.

## Build And Diff

Keep the user's checkout where it is. Every other tree is a separate worktree.

1. Create a base worktree at the merge base:
   `git worktree add --detach "$(mktemp -d "${TMPDIR:-/tmp}/code-review-base.XXXXXX")" <merge-base>`.
   For a PR, create a head worktree the same way at the head SHA.
2. Run `dune build` on head. A failing head build is a High finding.
3. Diff every public `.mli` and `.rei` between base and head. A public module
   with no interface file exports everything: compare its inferred interface
   (`ocaml-print-intf`, or `ocamlc -i` through `dune exec`), or list it under
   declined to judge.
4. Diff `public_name` stanzas in `dune` files, `depends` in `*.opam` and
   `dune-project`, ppx sources, and `melange.emit` targets.
5. Remove the worktrees with `git worktree remove`.

## Breaking Changes

**Breaking** for downstream code:

- New constructor in a public variant: breaks exhaustive matches.
- New field in a public record: breaks record construction.
- New value or type in a public module type: breaks its implementations.
- Removed or renamed value, type, module, or `public_name`.
- Narrower type: a parameter type that accepts less, or a result that
  promises more.
- Raised opam lower bound.
- Changed ppx expansion or Melange JS output that users compile against.

**Possibly breaking**: a new value in a module that users `open` or
`include`, which can shadow their own names.

A removal needs an earlier release with `[@@deprecated "use X"]`. Every
user-visible change needs a `CHANGES.md` entry. Report each break with the
version bump it requires.

## OCaml/Reason Checklist

Apply each item to the changed lines:

- A `_` or catch-all pattern over a variant the project owns, which hides the
  exhaustiveness check when a constructor is added.
- `[@warning "-8"]` or another disabled partial-match warning.
- `Obj.magic` without a stated invariant that proves the cast.
- `with _ ->` or `| exception _ ->` that swallows unexpected errors.
- `Option.get` or `List.hd` where `None` or `[]` is reachable.
- A new library use without its `libraries` entry in `dune`, or a test-only
  dependency missing `{with-test}`.
- Melange code where value identity matters, such as React hook dependency
  arrays: load the `melange-advanced` skill.

Leave to the compiler, warnings, and ocamlformat what they already report.

## Report

Add an **API and semver** section: breaks, possible breaks, deprecation and
`CHANGES.md` status, and the required version bump.
