---
name: notion-inbox-curator
description: Curate URL captures in the Notion Inbox database. Use when asked to process, enrich, sort, or import Inbox pages with a filter such as `status = today`, `status = "to sort"`, `all`, or a single page; imports YouTube videos, X/Twitter posts and threads, and blog articles into their Notion pages.
---

# Notion Inbox Curator

Turn raw links in the Notion `Inbox` database into useful, self-contained pages.

## Input

Accept one filter and an optional limit or page URL. Examples:

- `status = today`
- `status = "to sort"`
- `all`
- `status = "to sort", limit = 1`
- a specific Notion Inbox page URL

If no filter is supplied, ask for one. Never silently process the entire Inbox.

Treat status values case-insensitively in user input, but resolve them to the exact option names from the current database schema before querying. `all` means no status predicate. A page URL means process only that page after verifying it belongs to Inbox.

## Workflow

### 1. Find Inbox and inspect its schema

1. Search Notion for the database named `Inbox`.
2. If there is more than one plausible database, ask the user which one to use.
3. Fetch the database before every run. Do not hard-code database, data-source, property, status, or view IDs.
4. Identify the title property, status property, and URL property from the returned schema. Prefer the property whose displayed name is `URL`; tool calls may expose it as `userDefined:URL`.
5. Read `notion://docs/enhanced-markdown-spec` before writing page content.

### 2. Gather the complete result set

Query the Inbox data source directly rather than relying on a view. Select at least the page URL, title, status, canonical URL, and any alternate link property.

- Apply the requested filter in the query.
- Follow pagination until `has_more` is false.
- If the user supplied a limit, apply it after filtering and deterministic ordering.
- Report the number of matching pages before editing.

For each row, fetch the page. Resolve the source URL in this order:

1. URL found in the title property's link target or text
2. Canonical URL property
3. Alternate link property

Normalize tracking-only query parameters away when safe, but retain parameters required to identify content, such as a YouTube video ID or X status ID. If no source URL can be found, skip the page and report why.

For a first-time import, the title must itself be a URL or a Markdown link whose text or target is the URL. The URL-property fallbacks exist so an interrupted run can resume and an already-imported page can be verified; do not use them to overwrite an ordinary user-written page title.

### 3. Classify the source

- **YouTube:** `youtube.com`, `youtu.be`, Shorts, Live, or Music URLs that identify a video.
- **X/Twitter:** `x.com` or `twitter.com` status URLs, including posts, long posts, quoted posts, and threads.
- **Blog article:** a readable article or essay page. Do not treat homepages, product pages, repositories, Reddit posts, PDFs, or arbitrary web apps as blog articles.
- **Unsupported:** leave unchanged and report the URL.

Classify by the final resolved URL and fetched metadata, not the hostname alone.

### 4. Fetch source content

Use the least fragile source that returns authoritative content:

- **YouTube:** use YouTube oEmbed metadata for the title and canonical video URL. Fall back to the rendered YouTube page if oEmbed fails.
- **X/Twitter:** use the rendered post while authenticated when available. A public syndication endpoint may be used when it returns the post author, full untruncated text, quoted post, media, and thread data. Never use a search-result snippet as tweet content.
- **Blog:** fetch the article and extract its reader/main content. Use browser rendering for JavaScript-heavy or access-gated pages.

For an X thread, include only the contiguous posts by the same author that form the thread. Do not import unrelated replies. Preserve post order, quoted-post attribution, links, and meaningful media. If only part of a thread is accessible, do not claim the thread is complete; import the accessible post and report the limitation.

For a blog article, remove navigation, cookie notices, share controls, subscription prompts, related-post lists, and footer boilerplate. Preserve headings, paragraphs, lists, quotes, code blocks, links, and meaningful inline images. Do not invent missing text or summarize unless the user asked for a summary.

### 5. Build the Notion update

Always write the normalized source URL to the canonical URL property when one exists. This preserves the source after replacing a URL-shaped title.

#### YouTube

- Title: `🎥 {exact YouTube title}`
- Content: a native Notion video block using `<video src="URL">Title</video>` followed by `[Watch on YouTube](URL)`.
- Do not paste the oEmbed iframe HTML.

#### X/Twitter

- Title: the first meaningful sentence or clause of the first post, normalized to one line and truncated at a word boundary to at most 100 characters. Do not add an ellipsis unless truncated.
- Start content with `**Display name** ([@handle](profile URL))`. Do not put the link inside the bold span.
- Put short post text in a quote block, using `<br>` for line breaks. For long posts and threads, use normal paragraphs and lists so the content remains readable.
- Include thread posts in order, quoted-post content, meaningful media blocks when supported, and finish with `[View on X](URL)`.
- Keep the source URL in the canonical URL property.

#### Blog article

- Title: the article's published title, without the site-name suffix when clearly separate.
- Content: optional author/date metadata, then the cleaned article body in Notion-flavored Markdown, followed by a divider and `[Read the original article](URL)`.
- Keep the source URL in the canonical URL property.

Escape text according to Notion-flavored Markdown. Do not wrap imported prose in a code block. Use direct media URLs only when they are stable and publicly reachable.

### 6. Preserve data and make reruns safe

Fetch each page immediately before updating it.

- If the page is blank, write the imported content.
- If it already has content, preserve it. Append imported content under `## Imported content` only when that source is not already present.
- If the page already contains the same source URL and the expected embed/body, update only missing or incorrect properties.
- Never use `replace_content` on a page with existing content, child pages, or child databases.
- Never change Status, Project, Date, relations, checkboxes, or other properties unless the user explicitly asks.
- Process one page at a time. A failure must not prevent later pages from being attempted.

### 7. Verify every page

After each update, fetch the page again and verify:

- the title is no longer a raw URL;
- the canonical URL property equals the source URL;
- the expected video block, post text, or article body is present;
- pre-existing content and unrelated properties remain intact.

If verification fails, make one targeted correction and fetch again. Do not repeatedly rewrite the whole page.

## Completion report

Return a compact table with one row per page:

| Page | Type | Result | Notes |
| --- | --- | --- | --- |

Use `Updated`, `Already current`, `Skipped`, or `Failed` as Result. Include the page link and mention partial threads, inaccessible sources, unsupported URLs, and verification failures. End with totals for matched, updated, already current, skipped, and failed pages.
