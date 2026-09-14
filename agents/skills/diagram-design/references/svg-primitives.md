# SVG primitives

Load when creating or redrawing SVG, not for profile management or export alone. Type-specialized primitives live in the selected type reference. Resolve example colors and fonts through the effective [style guide](style-guide.md); examples show the shipped skin.

## Optional primitives

- Editorial callouts: [primitive-annotation.md](primitive-annotation.md).
- Hand-drawn variant: [primitive-sketchy.md](primitive-sketchy.md).
- Icon set: [primitive-icons.md](primitive-icons.md); gallery at [assets/icons.html](../assets/icons.html).
- Terminal / CLI-window variant: [primitive-terminal.md](primitive-terminal.md).
- Explanatory motion: [animation.md](animation.md), only when requested or when it materially clarifies ordered change.

## Background

**Default: clean paper, no dot pattern.** Single `<rect>` filled with `paper`. Don't wrap the diagram in a secondary container background; it sits directly on the page.

```svg
<rect width="100%" height="100%" fill="#f5f5f5"/>
```

**Optional: dotted paper variant.** When a long-form editorial diagram benefits from textured ground (essays, hero diagrams on a dedicated page), add the `dots` pattern and a second rect:

```svg
<defs>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="0.9" fill="rgba(45,49,66,0.10)"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="#f5f5f5"/>
<rect width="100%" height="100%" fill="url(#dots)" opacity="0.6"/>
```

Don't use the dot pattern inside a product page, slide, or card; it compounds with surrounding chrome.

## Arrow markers

Define all three markers:

```svg
<marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
  <polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/>
</marker>
<marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
  <polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/>
</marker>
<marker id="arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
  <polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/>
</marker>
```

| Arrow | Stroke | When |
|---|---|---|
| Default | `muted` | Internal, generic |
| Accent | `accent` | Primary / highlighted / headline |
| Link-blue | `link` | HTTP/API calls, external systems |
| Dashed | `stroke-dasharray="5,4"` + any color | Optional, passive, return, async |

Draw arrows before boxes so lines sit behind nodes.

## Mandatory connector rules

Verify all six rules before output. Explicit type-specific primitives retain their documented exemptions; imports do not gain exemptions.

1. **Rounded right-angle (orthogonal) connectors are mandatory.** Never use diagonal `<line>` or straight slanted paths between nodes that don't share an x or y axis. Every bend must be a quarter-arc with `r=8` (or `r=6` minimum for tight layouts). See [type-architecture.md](type-architecture.md) for the elbow-path formula. Reserve plain straight `<line>` only for connections whose endpoints share the same x or y coordinate. Diagonal connectors are an automatic fail.
2. **Label-to-connector margin: 6–10px gap, always.** A label must never sit on its arrow. Place the label centered above (or beside, for vertical segments) the line with a minimum 6px gap between the label's opaque mask rect and the connector stroke. If 6px feels cramped, use 8–10px. Never let the mask rect touch or overlap the stroke.
3. **No overlapping connectors.** Two connectors must never share a stroke path or be drawn on top of each other for any segment. When two orthogonal arrows cross at one point, apply the [bridge / hop primitive](type-architecture.md#crossing-arrows--bridge--hop). Offset routes by at least 12px so each is independently traceable. If routes still stack, redesign the layout or split into overview + detail.
4. **Shared edge: fan the attach points.** Each connector entering or leaving the same box edge needs a distinct attach point. Spread points evenly, at least 12px apart (8px minimum for very small boxes). For N connectors on an edge of length L, point k (1..N) sits at offset `L * k / (N + 1)` from the leading corner. Route each orthogonally from its own point; never merge strokes near the box. Parallel connectors stay at least 12px apart along their full length. No connector may hide another.
5. **Reroute around non-endpoint boxes.** A connector must not pass behind a box other than its source or destination, except when a cross-cutting node is geometrically unavoidable on the only direct orthogonal path. For example, a metrics path from an Observability footer bar may have to cross an intervening Active Directory bar. Only in that case, use a dashed stroke (`4,3`) to signal transit, put the label at the visible end (usually near the source), and place the arrowhead at the true destination, never at the intervening box. This is not a shortcut when rerouting is possible.
6. **A label mask must not overlap a node drawn after it.** Later node fills clip the mask and text. Place labels on open canvas; a label to the right of a node must clear its `x + width`. A mask fully inside a node is a badge chip and is allowed. Overlap with a zone container is allowed because zones are drawn first.

## Node box

```svg
<!-- Opaque paper mask prevents arrows bleeding through transparent fills. -->
<rect x="X" y="Y" width="W" height="H" rx="6" fill="#f5f5f5"/>
<rect x="X" y="Y" width="W" height="H" rx="6" fill="FILL" stroke="STROKE" stroke-width="1"/>
<rect x="X+8" y="Y+6" width="28" height="12" rx="2" fill="transparent" stroke="STROKE@0.40" stroke-width="0.8"/>
<text x="X+22" y="Y+15" fill="STROKE@0.8" font-size="7" font-family="'Geist Mono', monospace"
      text-anchor="middle" letter-spacing="0.08em">API</text>
<text x="CX" y="CY+2" fill="#2d3142" font-size="12" font-weight="600"
      font-family="'Geist', sans-serif" text-anchor="middle">Node Name</text>
<text x="CX" y="CY+18" fill="#4f5d75" font-size="9"
      font-family="'Geist Mono', monospace" text-anchor="middle">tech:port</text>
```

Type tags are rectangular (`rx=2`), not pills. Human names use sans; technical sublabels use mono. Node fills and strokes use the [node-treatment table](style-guide.md#node-type--treatment).

## Arrow labels

Every arrow label needs an opaque `paper` rect behind it and a visible gap from its connector.

```svg
<!-- Stroke is at ARROW_Y; the mask leaves an 8px gap. -->
<rect x="MID_X-18" y="ARROW_Y-20" width="36" height="12" rx="2" fill="#f5f5f5"/>
<text x="MID_X" y="ARROW_Y-11" fill="#7a8399" font-size="8"
      font-family="'Geist Mono', monospace" text-anchor="middle" letter-spacing="0.06em">WRITE</text>
```

- At most 14 characters, all-caps, centered on the segment midpoint.
- Keep a 6–10px gap between the mask and stroke. For vertical segments, put the label beside the line with the same horizontal gap.
- Never use vertical `writing-mode` text.

## Legend

Place the legend in a horizontal bottom strip, never inside the diagram area. Add a hairline separator and expand `viewBox` height by about 60px.

```svg
<line x1="30" y1="LEGEND_Y-8" x2="VIEWBOX_W-30" y2="LEGEND_Y-8"
      stroke="rgba(45,49,66,0.10)" stroke-width="0.8"/>
<text x="30" y="LEGEND_Y+8" fill="#4f5d75" font-size="8" font-family="'Geist Mono', monospace"
      letter-spacing="0.14em">LEGEND</text>
```

Space legend items about 160px apart.

## Layout and spacing

All font sizes, padding, node dimensions, gaps, and coordinates use the 4px grid.

| Category | Allowed values |
|---|---|
| Font sizes | 8, 12, 16, 20, 24, 28, 32, 40 |
| Node width / height | 80, 96, 112, 120, 128, 140, 144, 160, 180, 200, 240, 320 |
| x / y coordinates | multiples of 4 |
| Gap between nodes | 20, 24, 32, 40, 48 |
| Padding inside boxes | 8, 12, 16 |
| Border radius | 4, 6, 8 |

Exempt: stroke widths (0.8, 1, 1.2), opacity values, and the 22×22 dot-pattern.
