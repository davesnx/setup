# Typography

## Implementation Fit

Match the project's existing styling system. CSS declarations are the source of truth. Translate them to Tailwind only after checking the installed version, configuration, and plugins; if no supported utility exists, use the project's established CSS path.

## Classic Typography Principles

### Vertical Rhythm

Use the body line-height as one reference for vertical rhythm, not the only spacing unit. Align larger content intervals to the text baseline where useful while retaining the project's finer spacing scale for controls and component internals.

### Modular Scale & Hierarchy

The common mistake: too many font sizes that are too close together (14px, 15px, 16px, 18px...). This creates muddy hierarchy.

**Use fewer sizes with more contrast.** A 5-size system covers most needs:

| Role | Typical Ratio | Use Case |
|------|---------------|----------|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem | Body text |
| lg | 1.25-1.5rem | Subheadings, lead text |
| xl+ | 2-4rem | Headlines, hero text |

Popular ratios: 1.25 (major third), 1.333 (perfect fourth), 1.5 (perfect fifth). Pick one and commit.

### Readability & Measure

Use `ch` units for character-based measure (`max-width: 65ch`). Line-height scales inversely with line length—narrow columns need tighter leading, wide columns need more.

**Non-obvious**: Increase line-height for light text on dark backgrounds. The perceived weight is lighter, so text needs more breathing room. Add 0.05-0.1 to your normal line-height.

## Font Selection & Pairing

### Choosing Distinctive Fonts

**Avoid the invisible defaults**: Inter, Roboto, Open Sans, Lato, Montserrat. These are everywhere, making your design feel generic. They're fine for documentation or tools where personality isn't the goal—but if you want distinctive design, look elsewhere.

**Better Google Fonts alternatives**:
- Instead of Inter → **Instrument Sans**, **Plus Jakarta Sans**, **Outfit**
- Instead of Roboto → **Onest**, **Figtree**, **Urbanist**
- Instead of Open Sans → **Source Sans 3**, **Nunito Sans**, **DM Sans**
- For editorial/premium feel → **Fraunces**, **Newsreader**, **Lora**

**System fonts are underrated**: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable. Consider this for apps where performance > personality.

### Pairing Principles

**The non-obvious truth**: You often don't need a second font. One well-chosen font family in multiple weights creates cleaner hierarchy than two competing typefaces. Only add a second font when you need genuine contrast (e.g., display headlines + body serif).

When pairing, contrast on multiple axes:
- Serif + Sans (structure contrast)
- Geometric + Humanist (personality contrast)
- Condensed display + Wide body (proportion contrast)

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs). They create visual tension without clear hierarchy.

### Web Font Loading

The layout shift problem: fonts load late, text reflows, and users see content jump. Here's the fix:

```css
/* 1. Use font-display: swap for visibility */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* 2. Match fallback metrics to minimize shift */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;        /* Scale to match x-height */
  ascent-override: 90%;     /* Match ascender height */
  descent-override: 20%;    /* Match descender depth */
  line-gap-override: 10%;   /* Match line spacing */
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

Tools like [Fontaine](https://github.com/unjs/fontaine) calculate these overrides automatically.

Serve web fonts as `.woff2`. Static files are often smaller for one or two used weights; variable fonts become useful when several weights or axes replace multiple files. Use `font-synthesis: none` only when every weight and style used by the interface is loaded; otherwise it can remove useful fallback bold or italic rendering.

## Modern Web Typography

### Fluid Type

Use `clamp(min, preferred, max)` for fluid typography. The middle value (e.g., `5vw + 1rem`) controls scaling rate—higher vw = faster scaling. Add a rem offset so it doesn't collapse to 0 on small screens.

**When NOT to use fluid type**: Button text, labels, UI elements (should be consistent), very short text, or when you need precise breakpoint control.

### Wrapping and Overflow

Choose wrapping by content role. Use `text-wrap: balance` for short headings, captions, or blockquotes spanning a few lines. Use `text-wrap: pretty` selectively for prose when improved breaks justify its slower, engine-dependent algorithm. Keep normal wrapping for dense or frequently changing UI copy. Verify with the actual font, width, zoom, and locale.

Use `overflow-wrap: anywhere` for untrusted URLs, IDs, and other long tokens. Reserve `white-space: nowrap` for bounded, atomic labels and test it under localization and zoom.

### Language and Bidirectional Text

Set the document or component `lang` correctly and use `dir="rtl"` where the content direction requires it. Prefer logical properties (`margin-inline`, `padding-block`) and `text-align: start` over left/right assumptions. Test wrapping, truncation, punctuation, numerals, and icon direction with real localized strings.

### OpenType Features

Most developers don't know these exist. Use them for polish:

```css
/* Tabular numbers for data alignment */
.data-table { font-variant-numeric: tabular-nums; }

/* Proper fractions */
.recipe-amount { font-variant-numeric: diagonal-fractions; }

/* Small caps for abbreviations */
abbr { font-variant-caps: all-small-caps; }

/* Disable ligatures in code */
code { font-variant-ligatures: none; }

/* Enable kerning (usually on by default, but be explicit) */
body { font-kerning: normal; }
```

Check what features your font supports at [Wakamai Fondue](https://wakamaifondue.com/).

Prefer semantic properties such as `font-weight`, `font-optical-sizing`, and `font-variant-*`. Reserve `font-variation-settings` and `font-feature-settings` for custom axes or features without dedicated properties.

## Typography System Architecture

Name tokens semantically (`--text-body`, `--text-heading`), not by value (`--font-size-16`). Include font stacks, size scale, weights, line-heights, and letter-spacing in your token system.

## Accessibility Considerations

Beyond contrast ratios (which are well-documented), consider:

- **Never disable zoom**: `user-scalable=no` breaks accessibility. If your layout breaks at 200% zoom, fix the layout.
- **Respect user sizing**: `rem`/`em` usually preserves user browser settings better than fixed CSS pixels. `1rem`/16px is a robust body default, not a WCAG minimum.
- **Verify text contrast**: WCAG AA requires 4.5:1 for normal text. 3:1 applies only to large-scale text: at least 18pt/24 CSS px regular, or 14pt/~18.5 CSS px bold, generally weight 700+.
- **Preserve selection**: Do not disable selection across an interface or by default on buttons. Use `user-select: none` only where selection conflicts with a gesture, such as drag handles or canvas controls. Preserve selection for prose, code, identifiers, values, errors, and editable content.
- **Avoid iOS focus zoom**: Keep editable controls at 16 CSS px or larger on narrow iOS viewports. Never suppress zoom through viewport metadata.
- **Expose truncated content**: Ellipsis and line clamping hide content visually. When the omitted value matters, expose it through an expanded view, detail view, or accessible tooltip.
- **Adequate touch targets**: Text links need padding or line-height that creates 44px+ tap targets.

---

**Avoid**: More than 2-3 font families per project. Skipping fallback font definitions. Ignoring font loading performance (FOUT/FOIT). Using decorative fonts for body text.
