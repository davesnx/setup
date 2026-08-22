---
name: eli5
description: Create a self-contained visual HTML explanation when the user says "ELI5", "explain X", "what is X", "how does this work", "walk me through this", or shows confusion. Use for concepts, codebases, architectures, and flows that benefit from a clear, scrollable guide.
argument-hint: "what to explain (optionally: --literal-5yo)"
metadata:
  source: "https://gist.github.com/rcosteira79/3785ef546092f80aa5c25f97b7e1ad71"
---

# ELI5

Build one visual explanation as one self-contained HTML file, then serve it locally. Teach a sharp person from another domain. Simplify the explanation, never the facts.

With `--literal-5yo`, use everyday situations, short sentences, and no code. Do not talk down to the reader.

The failure this skill prevents is the complete answer: everything about the topic at full resolution in one pass. Give the reader a foothold first. Depth comes from moving through focused sections, not from putting more text in each section.

## Understand before teaching

- For a codebase, architecture, service, or named artifact, inspect the real code and documentation first. Explore silently. Do not simplify behavior that you have not verified.
- For a current, unfamiliar, or disputed topic, check primary sources before writing. Separate verified facts from assumptions.
- Decide what the reader should understand after reading the page. Keep one learning goal.
- Choose one concrete journey through the topic. A single request, click, data record, or worked example teaches more than a full catalog.
- If the request is ambiguous, make the narrowest useful interpretation and state it in the opening section.

## Explain at learning pace

- Put one new idea in each section.
- Start each section with the answer, then explain it.
- Define a necessary technical term in plain words at first use. Remove terms that do not help the learning goal.
- Prefer concrete cause and effect. Write "the app asks the database for the saved order" instead of "the persistence layer is queried".
- Use one strong analogy when it helps. State where the analogy stops matching if that limit could mislead the reader.
- Use one representative case instead of listing every option, operator, or edge case.
- Keep supporting text to about 80 words per section. Use more only when accuracy requires it.
- Do not call anything simple, easy, obvious, magical, or just an implementation detail.
- End with two or three specific paths the reader can explore next.

## Pick a story shape

Use 5-9 sections. Add more only when the user asks for a deep treatment.

### Concept mode

Use for a term, mechanism, API, or technical idea:

1. Show the problem in an everyday or concrete situation.
2. Show the core mental model and the one fact to remember.
3. Walk through one example from start to finish.
4. Show the most important limit, tradeoff, or failure case.
5. Recap the model and offer deeper paths.

### System mode

Use for a codebase, architecture, service, or feature flow:

1. State what the system does and who needs it.
2. Introduce the 3-5 major parts with plain names and one job each.
3. Trace one request, run, or click through those parts over several sections.
4. Explain up to three decisions that would surprise a newcomer and why they exist.
5. End with the mental model, deeper paths, and a short reading list of real files or design records.

Do not put file citations inside the teaching copy. Keep them in the final reading-list section so the explanation remains readable.

## Make the visuals teach

The artifact is image-led. Text supports the pictures.

- Include a large explanatory visual in every teaching section. The visual should use roughly half of the available width on a typical laptop.
- Create the visuals as inline SVG whenever possible. Inline SVG keeps the file portable, sharp, and editable.
- Use diagrams, spatial layouts, state comparisons, timelines, and annotated objects. Do not use decorative icon grids or generic illustrations.
- Keep the same objects visually consistent across sections. Move, highlight, add, or remove parts to show what changed.
- Label the exact thing the prose names. Use plain labels, not internal class names, unless the internal name is the subject.
- Use arrows only for a real direction, sequence, or transfer. Make their start and end unambiguous.
- Keep diagrams small in concept count: one focus, one direction, and no more than 5-7 labeled objects per scene.
- Do not rely on color alone. Pair color with labels, shapes, patterns, or position.
- Give each meaningful SVG a `<title>` and `<desc>`. Decorative shapes must be hidden from assistive technology.
- Use actual screenshots or photos only when the real appearance is necessary to understand the topic. Embed them as data URLs so the result stays self-contained.

## Build one HTML file

Create `<topic>-eli5.html` in the current workspace unless the user gives a path. Use a safe, short, lowercase topic name.

The file must contain all HTML, CSS, JavaScript, SVG, and other image data. Do not create companion files. Do not load a CDN, web font, framework, Mermaid, analytics, or any remote asset. Source links may point to the web, but the page must work without them.

The page must include:

- One continuous, vertically scrolling article with clearly separated sections.
- A short table of contents that shows the full route and links to each major section.
- Stable heading anchors such as `#server-authority` so refresh and shared links keep the reader's place.
- Normal browser scrolling as the primary interaction. Do not add slide behavior, **Previous** or **Next** controls, or keyboard page navigation.
- Responsive layouts for desktop and mobile. On small screens, place the image before the supporting text.
- System fonts, readable line lengths, and body-text contrast of at least 4.5:1.
- Visible keyboard focus, semantic headings, real buttons, and useful accessible names.
- No autoplay. Honor `prefers-reduced-motion` and keep the content usable without animation.
- Progressive enhancement: all core content and navigation remain readable if JavaScript fails.
- Print styles that preserve all sections in order.

Pick a visual language that matches the subject. A network explanation can resemble a clear wall map. A compiler explanation can resemble an assembly line. Do not default to a generic dashboard, a repeated card grid, beige paper styling, gradient text, or glass panels.

## Serve it locally

Serve the containing directory over HTTP instead of opening the file through `file://`. Always bind to `0.0.0.0` and use an available nspawn port from `25000` through `25099`. Check active listeners before choosing a port. Do not use a port outside this range for an ELI5 artifact.

```sh
python3 -m http.server 25000 --bind 0.0.0.0 --directory "/absolute/path/to/output-directory"
```

Run the server in a way that does not block the remaining work. Record its process ID or use the harness process controls so it can be stopped later. Do not deploy the artifact unless the user asks.

Check `/run/systemd/container` to detect systemd-nspawn. In nspawn, open and report the exact page URL with `febox-uk.ahrefs.net`, for example `http://febox-uk.ahrefs.net:25000/topic-eli5.html`. Outside nspawn, use the machine's non-loopback address from `hostname -I`. Do not report `0.0.0.0` or `127.0.0.1` as the user-facing address.

## Verify the explanation

Use available browser automation. Do not declare the artifact finished from source inspection alone.

1. Open the served URL and check the browser console for errors.
2. Read every section in order. Confirm that each section adds one idea and that the example remains consistent.
3. Test the table of contents, section anchors, URL hash, refresh, and browser Back navigation.
4. Test a desktop viewport and a narrow mobile viewport. Confirm that the page scrolls naturally and that headings, labels, and SVG text do not overflow.
5. Inspect the visuals at normal size. Confirm that labels are legible and that each image explains its section without decorative clutter.
6. Check keyboard focus order and reduced-motion behavior.
7. Confirm that the page makes no required network requests and still renders when remote access is unavailable.

Fix every problem found during verification. After the final edit, repeat the affected checks.

## Return to the user

Do not paste the HTML into the response. Give the user:

- The artifact path.
- The local URL.
- One sentence about the journey the page teaches.
- The two or three deeper paths offered in the final section.

Keep the response short. The page is the explanation.
