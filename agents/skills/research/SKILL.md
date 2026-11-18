---
name: research
description: Investigate a question against high-trust primary sources, including papers and the researchers who originated the ideas, and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs, API, or literature facts gathered, or reading legwork delegated to a background agent. For an explanation answered in chat, use how.
---

Spin up a **background agent** to do the research, so you keep working while it reads. Start it with a fresh context window.

Its job:

1. Investigate the question against **primary sources**, not a secondary write-up of them. Follow every claim back to the source that owns it:
   - Software: official docs, source code, specs, first-party APIs.
   - Research: the original paper or PDF (journal or conference version, preprint, thesis, technical report), and the writing, talks, and books of the researchers who introduced or own the idea. Treat a blog post, survey, or summary as a pointer to the paper it cites, then read that paper.
2. Read papers in full, not their abstracts. Extract PDF text with a PDF tool when the reader cannot open it. Cite the page or section that supports each claim.
3. For each paper, record the authors, year, venue, and whether it is peer-reviewed or a preprint. Separate what the authors measured from what they speculate. Note later work by the same authors or the field that retracts, corrects, or contests it.
4. Cross-check each contested claim against independent sources, and say where the evidence is weak.
5. Write the findings to a single Markdown file, citing each claim's source with a link (DOI or arXiv ID for papers).
6. Save it where the repo already keeps such notes; match the existing convention. Under `/home/me/workplace`, that is `.workplace/docs/`. Otherwise put it somewhere sensible and say where.
