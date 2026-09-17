---
name: create-issue
description: Use when asked to open, file, report, or create a GitHub issue, or to write or edit an issue title or body. Reads the repository's templates and recent issues for style, searches for duplicates, writes a short body around a verified reproduction, and files the issue only with explicit authorization. Not for pull requests; use create-pr. Not for splitting a plan into tickets; use to-tickets.
---

# Create an issue

Own the target repository, the duplicate check, the title and body, and the
remote issue operation. Load `github` for `gh` gotchas. Preparing an issue does
not authorize filing it. When the user asks only for a title or body, skip
step 5 and return the text.

## 1. Resolve the repository and its style

1. Resolve the target from the user's request, the failing dependency, or the
   current checkout. Never assume `origin` is the target; a fork's issues
   belong upstream. Confirm issues are enabled:

   ```sh
   gh repo view <owner/repo> --json hasIssuesEnabled,defaultBranchRef
   ```

   When they are disabled, report where the repository sends reports instead,
   such as the contact links in `.github/ISSUE_TEMPLATE/config.yml`, and stop.
2. Read the repository's reporting rules: `CONTRIBUTING`, `SECURITY.md`, and
   every file under `.github/ISSUE_TEMPLATE/`, including `config.yml`. A
   security-sensitive finding follows `SECURITY.md`, never a public issue.
3. Read the last twenty issues, open and closed, and the full body of three or
   four that maintainers answered without asking for more information:

   ```sh
   gh issue list -R <owner/repo> --state all --limit 20 --json number,title,labels,author,createdAt
   gh issue view <number> -R <owner/repo> --json title,body,labels
   ```

   Record the title grammar (prefix, case, component names), the section
   headings or template fields in use, typical length, and whether reporters
   set labels. These observations are the style for step 4. With no history
   and no template, use the default body in step 4.

## 2. Search for duplicates

Search open and closed issues for the symptom, the error text, and the
affected symbol, with two or three phrasings:

```sh
gh issue list -R <owner/repo> --state all --search '<terms>' --json number,title,state,url
```

A match means there is no new issue to file: return its URL and say what the
user's evidence adds. Post that evidence as a comment only when the user asks.
A closed match with a fix on the default branch means the user needs the fixed
version, not an issue; name the commit or release.

## 3. Establish the facts

Collect, from evidence you observed:

- What happened: the exact output, error text, or wrong result, trimmed to the
  relevant lines, with secrets and private paths removed.
- What was expected, and why: the documentation, type, or prior behavior that
  promises it.
- The smallest reproduction a maintainer can paste and run from a clean state:
  commands, a minimal file, or a failing test. Remove every line that does not
  change the result.
- Versions: the tool or library version, the runtime, the OS, and the commit
  or release when built from source.

Run the reproduction before writing it and keep its output as the evidence.
When it cannot run here, say so in the body and give the closest observation.
Never write output from memory or approximate it. Separate observation from
theory: a suspected cause or a pointer to the responsible code goes in one line
labeled as a guess.

For a request that is not a bug, replace the reproduction with the concrete
case that motivates it: what the user tried, why the current behavior falls
short, and the current workaround. Keep the same length.

## 4. Write the title and body

Write for a maintainer who reads the title in a list and the body once. The
body fits on one screen. No greeting, thanks, apology, or story of how the
problem was found.

- **Title.** Name the symptom, not the guessed cause, in the grammar observed
  in step 1: the same prefix, case, and component names. "Panics on empty
  input" beats "Bug in parser".
- **Body.** When a template exists, fill its sections in its order from the
  facts in step 3, and leave out a section only when it does not apply. A form
  template (`.yml` with `body:` fields) cannot be filled through `gh`; use its
  field labels as headings. Otherwise:
  1. What happened, in one to three sentences, with the exact output in a
     fenced block.
  2. Expected behavior, one sentence.
  3. Reproduction, one fenced block from a clean state.
  4. Versions, one line or a short list.
  5. Guess or workaround, one labeled line each, only when you have one.
- **Formatting.** Fenced blocks with a language tag for every command and
  output. Bullets for parallel facts. Headings only when the repository's
  issues use them. Links only to URLs GitHub renders; `gh` cannot upload
  attachments, so hand local screenshots to the user and name the gap.

Write the body to a temporary Markdown file outside the tracked source tree and
read it back. Check every claim, version, and output line against the evidence.
For a text-only request, return **Title**, **Body**, and, only when something
remains, **Notes**.

## 5. File and verify

File only when the user explicitly asks to create, open, or file the issue:

```sh
gh issue create -R <owner/repo> --title '<title>' --body-file <body-file>
```

Add `--label` only when the user asks and `gh label list` shows the label. Do
not assign people, set milestones, or add the issue to projects unless asked.
Read the issue back and confirm the title and body match the file:

```sh
gh issue view <url> --json number,url,title,body,labels
```

If the write times out or returns an uncertain result, search for the issue
before retrying so it cannot create a duplicate.

Return the URL, the duplicate-check result, and anything the maintainer still
needs from the user, such as a screenshot or a log that could not be shared.
