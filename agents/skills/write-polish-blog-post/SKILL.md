---
name: write-polish-blog-post
description: "Write blog posts from outlines, finish incomplete drafts, or edit existing prose. Resolve evidence gaps and help choose supporting art and code."
---

# Write and polish a blog post

Write in the author's voice and complete the requested work. Choose the path
from the request, not from how much unfinished material happens to be present.

## Choose the scope

- **Small edit:** Read the passage and enough surrounding text to preserve its
  meaning. Make the requested correction and check the changed text against the
  source. Stop there. A typo or local wording fix needs no whole-post review,
  asset planning, title options, or automatic `unslop` pass. If the user requests
  AI-tone cleanup, use `unslop` only on the selected text.
- **Finish a draft:** Read the draft and relevant source material. Use
  [references/gap-resolution.md](references/gap-resolution.md) to map gaps, check
  facts, ask for missing author input, and write supported additions. Use existing
  answers without a new interview. Finish when the requested gaps are resolved,
  or return a partial draft with the outstanding evidence and questions. If the
  request includes a complete polished article, continue with the full-post path.
- **Full drafting or polish:** Read the full outline or article and its supporting
  material. Use [references/drafting.md](references/drafting.md) for prose, art,
  code, and final revision. Use
  [references/writing-principles.md](references/writing-principles.md) for editorial
  decisions. Completion means the post answers its reader's question, required
  assets are present or explicitly waived, and unresolved placeholders are gone.

Read other references only when a problem in scope calls for them. A grammar fix
does not become a full polish because the rest of the post is unfinished.

## Voice and direction

For a small correction, use the passage's established voice and any supplied
guidance. For broader writing, read a relevant `VOICE.md` if present and use supplied
or clearly identified author samples. Compare viewpoint, vocabulary, rhythm,
asides, and how the author develops an argument. Preserve those choices without
copying sample content or forcing a quota of quirks. The requested voice, guide,
and samples take priority over generic advice. Their absence does not block writing;
use the supplied text, and ask only if an unresolved voice choice affects the work.

Use the agreed reader, argument, order, and conclusion. Ask only questions that
block the requested work. If a topic has no usable direction or structure, use
`create-drafted-blog-post` for that decision rather than inventing the author's
position. A supplied outline is enough to start writing.

## Output and edits

Follow the requested output location, including chat. For file output, expand an
outline or raw notes into a separate article file and keep the source unchanged.
Ask once for its path if none was supplied. When editing an existing article,
edit that file unless the user requests a separate version. If the author explicitly
wants to expand the outline in place, follow that choice.

For a direct request, complete the requested edit or writing scope. For collaborative writing,
propose one section or block, refine it from feedback, and save each agreed change.
Preserve any approval steps the author requested. Reread the file before each write
and make targeted edits; the author may have changed it between turns.

If the user switches to collecting notes, acknowledge the notes without editing;
resume writing only when requested.

## Evidence and meaning

Preserve facts, names, numbers, dates, quotations, citations, qualifications, and
conclusions unless the author asks to change the substance. Approval of a structure
does not confirm its proposed events or causes. When adding material, ask for missing
personal facts and check external facts. Keep other authors' experiences distinct from this author's.
Mark hypotheticals as hypothetical. Protect code, commands, proper names, and
technical terms during prose cleanup.

If evidence supports only part of the article, write that part and keep unresolved
markers visible. List what is missing separately from publishable prose. A smooth
transition or ending cannot supply missing evidence. Call the result a partial draft.

Before delivery, compare changed passages with the source. Restore lost claims
and qualifications, and remove unsupported additions. A supported uncertain or
mixed result can be a complete conclusion.

## Other stages

Offer `critique-blog-post` for an independent review or reader test. A review-only
request belongs there; it does not authorize edits here.

## Sources

Section-by-section writing adapts the former local blog-writing skills and
Anthropic's `doc-coauthoring`. Evidence safeguards draw on
[kdy1's blog workflow](https://github.com/kdy1/kdy1-scripts/blob/f9079364d84a9d3e1eaa1c8b8c9dbc60ee4e46de/skills/write-blog-post/SKILL.md)
and [compound-writing](https://github.com/everyinc/compound-writing) (MIT).
