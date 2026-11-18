# Presentation

Load when selecting a page template, variant, or editorial wrapper. Colors, fonts, and node treatments come from the effective [style guide](style-guide.md), not from example hex values.

## Templates and variants

The three standard variants are available in `assets/`; choose one for the request rather than producing all three.

| Variant | Template / example pattern | When to use |
|---|---|---|
| **Minimal light** (default) | [template.html](../assets/template.html), `example-<type>.html` | Screenshot-ready. Diagram + title. Warm paper. |
| **Minimal dark** | [template-dark.html](../assets/template-dark.html), `example-<type>-dark.html` | Dark mode sites, slides, high-contrast posts. |
| **Full editorial** | [template-full.html](../assets/template-full.html), `example-<type>-full.html` | Long-form posts where the diagram is the hero. |
| **Consultant special** (quadrant only) | [example-quadrant-consultant.html](../assets/example-quadrant-consultant.html) | BCG/McKinsey-style 2×2 scenario matrix. House skin, double-ended axes, named scenario cells. See [type-quadrant.md](type-quadrant.md#consultant-special-22-scenario-matrix). |

**Sketchy variant:** [primitive-sketchy.md](primitive-sketchy.md). Applied to any standard variant. SVG turbulence wobbles strokes for a hand-drawn feel. Good for essays, not technical docs.

**Terminal variant:** [primitive-terminal.md](primitive-terminal.md). Replaces a standard variant. Start from [template-terminal.html](../assets/template-terminal.html); examples use `example-<type>-terminal.html`. Charcoal CLI-window chrome, monospace, one red-orange accent. Good for dev-tool posts; not brand-tokenized, so skip it for onboarded output.

**Animation:** [animation.md](animation.md). Optional presentation layer: `none` (default), `reveal`, `step`, or `loop`. Motion never changes the static meaning or raises the complexity budget. Use [template-motion.html](../assets/template-motion.html) only when motion is selected.

## Page layout

1. **Header:** eyebrow (Geist Mono), title (Instrument Serif), optional subtitle (Geist muted).
2. **Diagram container:** clean, borderless, no background by default; SVG sits on the page paper. The optional framed variant for cards or hero placements uses `paper-2` background, 1px `rule` border, 8px radius, `1.5rem` padding, and `overflow-x: auto`.
3. **Summary cards:** 2–3 columns of varied widths, for example `1.1fr 1fr 0.9fr`.
4. **Footer:** colophon in Geist Mono, muted, hairline top border.

## Summary cards

Vary the treatment; do not use three identical generic cards.

```html
<div class="card">
  <p class="eyebrow">SECTION LABEL</p>
  <div class="card-header">
    <span class="card-dot coral"></span>
    <h3>Card Title</h3>
  </div>
  <ul><li>Item</li></ul>
</div>
```

- `background: #ffffff`, not paper: slight lift without shadow.
- `border: 1px solid rgba(45,49,66,0.12)`.
- `border-radius: 6px`, `padding: 1.25rem`.
- No `box-shadow`.
- Card dots: 7px, `border-radius: 50%`; ink / muted / coral / link / soft variants.

## Create from a template

1. Copy the closest variant, using full editorial for cards.
2. Replace the eyebrow, h1, and SVG body with the selected type and semantic pattern.
3. Replace `[diagram-slug]` with the file slug and fill `<title>` / `<desc>` per the [accessible SVG contract](../SKILL.md#accessible-svg-contract).
4. Keep static output script-free. For selected motion, follow the motion reference and its canonical controller requirements.
5. Run the [pre-output checklist](../SKILL.md#pre-output-checklist).
