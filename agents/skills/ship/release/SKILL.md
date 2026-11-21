---
name: release
description: Release a new version of an OCaml library to GitHub and opam-repository. Use for "release", "cut a release", "publish version X", or "bump the version". Checks that all work is merged and green, rewrites CHANGES.md as one line per pull request, picks the semver bump, tags, and follows CI until the opam-repository pull request.
---

# Release

Each step ends on its gate. A failed gate stops the release and goes to the user.

## 1. Ready

Run `git fetch`, then check:

- The checkout is on the default branch, clean, and equal to its upstream.
- `.workplace/status.md`, when present, has no `active` or `blocked` line for this repository.
- No `.workplace/worktrees/*` branch holds commits missing from the default branch.
- Open pull requests: `gh pr list --state open`. Ask the user which ones must land first.
- CI on the default branch head is green: use the `ci` skill.

Gate: every item holds, or the user waives it by name.

## 2. Changes

Find the last release with `git describe --tags --abbrev=0`. List what landed since:

```bash
gh pr list --state merged --base <default-branch> --search "merged:>=<tag-date>" --limit 200 \
  --json number,title,url,author,labels,mergedAt
git log <tag>..HEAD --oneline --no-merges
```

Match commits to pull requests. A commit with no pull request is listed by its short hash.

Gate: every commit since the tag maps to one pull request or one direct-commit entry.

## 3. Semver

Classify each change. A change is **breaking** when downstream code that compiled before can fail to compile or behave differently:

- removed or renamed value, type, module, or `public_name`;
- new constructor in a public variant, new field in a public record, new item in a public module type;
- narrower type, raised opam lower bound, changed ppx expansion or Melange JS output.

Check the code, not only the titles: diff every public `.mli`/`.rei` and the `*.opam` and `dune-project` `depends` between the tag and `HEAD`. A public module with no interface file exports everything.

Bump: breaking → major (minor before `1.0.0`), new feature → minor, otherwise patch. Keep the existing pre-release style, such as `1.0.0~beta-2`.

Gate: the version and the list of breaking changes, each with its pull request.

## 4. CHANGES.md

Replace the `Unreleased` section with a header for the new version in the file's existing header style, for example `## 1.3.0 (2026-11-21)`. Keep an empty `# Unreleased` above it when the file had one. Leave older sections unchanged.

One line per pull request, breaking changes first:

```md
- [BREAKING] Rename `Html.render` to `Html.to_string` ([#142](https://github.com/o/r/pull/142)) (@author)
- [FEATURE] Support mlx fragments ([#139](https://github.com/o/r/pull/139)) (@author)
- [FIX] Keep every fragment child ([#140](https://github.com/o/r/pull/140)) (@author)
- [CHORE] Bump ocamlformat to 0.27.0 ([#141](https://github.com/o/r/pull/141)) (@author)
```

Tags: `[BREAKING]`, `[FEATURE]`, `[FIX]`, `[PERF]`, `[DOCS]`, `[CHORE]`. Use the pull request title, shortened to one line. A direct commit uses its hash in place of the link. Prose from the old entries that no pull request carries goes into the matching pull request line, in one clause.

Show the version and the new section to the user.

Gate: the user approves both.

## 5. Publish

1. Set the version where the repository keeps one (`dune-project` `(version …)`, `*.opam`); otherwise the tag is the version.
2. Run the repository checks: build, tests, format, and `opam lint` on every `*.opam`.
3. Commit `Release X.Y.Z` with the `github` skill and push to the default branch.
4. Wait for CI on that commit to be green.
5. Tag and push. This publishes to opam: run it only after the user's go-ahead for this version.
   ```bash
   git tag -a X.Y.Z -m "Release X.Y.Z"
   git push origin X.Y.Z
   ```

When the repository has no release workflow (`dune-release-action` on tag push), stop after the tag and ask the user to run `dune-release` locally, because it needs their opam-repository fork and token.

Gate: the tag is on the release commit and the release workflow started.

## 6. Follow through

- Follow the release workflow run with the `ci` skill until it finishes.
- Check the GitHub release exists: `gh release view X.Y.Z`.
- Find the opam-repository pull request: `gh pr list -R ocaml/opam-repository --search "<package>.X.Y.Z" --state all`.
- Read its CI. A metadata failure, such as a missing lower bound or an unsupported platform, is fixed in the opam file of that pull request. A code failure needs a fix in the repository and a new patch release. Ask the user before either.

Gate: report the GitHub release URL, the opam-repository pull request URL, and its CI state. Merging can take days; offer a scheduled check-in for it.
