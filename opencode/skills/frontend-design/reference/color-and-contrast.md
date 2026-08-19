# Color & Contrast

## Color Spaces: Use OKLCH

**Stop using HSL.** Use OKLCH (or LCH) instead. It's perceptually uniform, meaning equal steps in lightness *look* equal—unlike HSL where 50% lightness in yellow looks bright while 50% in blue looks dark.

```css
/* OKLCH: lightness (0-100%), chroma (0-0.4+), hue (0-360) */
--color-primary: oklch(60% 0.15 250);      /* Blue */
--color-primary-light: oklch(85% 0.08 250); /* Same hue, lighter */
--color-primary-dark: oklch(35% 0.12 250);  /* Same hue, darker */
```

**Key insight**: As you move toward white or black, reduce chroma (saturation). High chroma at extreme lightness looks garish. A light blue at 85% lightness needs ~0.08 chroma, not the 0.15 of your base color.

### Gamut-Aware Output

An OKLCH value may fall outside the target display gamut. Gamut-map every shipped output separately, preferably by reducing chroma perceptually instead of clipping RGB channels. Validate the sRGB fallback and any Display-P3 enhancement independently. When migrating existing colors, convert only values consumed as CSS colors; preserve opaque strings passed to charts, APIs, snapshots, or other libraries unless their format contract is known.

```css
.accent {
  color: var(--accent-srgb);
}

@media (color-gamut: p3) {
  .accent {
    color: var(--accent-p3);
  }
}
```

## Building Functional Palettes

### The Tinted Neutral Trap

Tint neutrals toward the brand hue when it creates useful cohesion, but do not tint by reflex. Achromatic neutrals remain valid for maximum contrast, image-led layouts, or established identities:

```css
/* Achromatic neutrals */
--gray-100: oklch(95% 0 0);     /* No personality */
--gray-900: oklch(15% 0 0);

/* Warm-tinted grays (add brand warmth) */
--gray-100: oklch(95% 0.01 60);  /* Hint of warmth */
--gray-900: oklch(15% 0.01 60);

/* Cool-tinted grays (tech, professional) */
--gray-100: oklch(95% 0.01 250); /* Hint of blue */
--gray-900: oklch(15% 0.01 250);
```

The chroma is tiny (0.01) but perceptible. It creates subconscious cohesion between your brand color and your UI.

### Palette Structure

A complete system needs:

| Role | Purpose | Example |
|------|---------|---------|
| **Primary** | Brand, CTAs, key actions | 1 color, 3-5 shades |
| **Neutral** | Text, backgrounds, borders | 9-11 shade scale |
| **Semantic** | Success, error, warning, info | 4 colors, 2-3 shades each |
| **Surface** | Cards, modals, overlays | 2-3 elevation levels |

**Skip secondary/tertiary unless you need them.** Most apps work fine with one accent color. Adding more creates decision fatigue and visual noise.

### Gamut-Aware Scales

Choose lightness stops for semantic roles rather than applying one universal formula. For each stop, select the intended lightness, chroma, and hue; gamut-map it to every supported output space; then inspect the result. Chroma usually needs to taper near black and white. A gamut boundary is a device constraint, not a perceptual vividness scale, so do not express chroma as a fixed percentage of the maximum.

### Circular Hue Comparison

Hue is circular: `355deg` and `5deg` are `10deg` apart, not `350deg`. Ignore near-achromatic colors when comparing hue because hue becomes unstable as chroma approaches zero.

```js
function circularHueSpan(hues) {
  if (hues.length < 2) return 0;

  const sorted = hues
    .map((hue) => ((hue % 360) + 360) % 360)
    .sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((hue, index) => hue - sorted[index]);

  gaps.push(sorted[0] + 360 - sorted[sorted.length - 1]);
  return 360 - Math.max(...gaps);
}
```

### Tailwind CSS v4 Theme Tokens

Tailwind's default named color scales have 11 steps: `50`, `100` through `900`, and `950`. Custom scales should define only the tokens the design uses. Verify the installed Tailwind version before emitting `@theme` or version-specific utilities.

```css
@theme {
  --color-brand-500: oklch(63% 0.1 145);
  --color-brand-700: oklch(45% 0.08 145);
}
```

### The 60-30-10 Rule for Restrained Palettes

For a restrained palette, this rule is about **visual weight**, not pixel count:

- **60%**: Neutral backgrounds, white space, base surfaces
- **30%**: Secondary colors—text, borders, inactive states
- **10%**: Accent—CTAs, highlights, focus states

The common mistake: using the accent color everywhere because it's "the brand color." Accent colors work *because* they're rare. Overuse kills their power.

## Contrast & Accessibility

### WCAG Requirements

| Content Type | AA Minimum | AAA Target |
|--------------|------------|------------|
| Body text | 4.5:1 | 7:1 |
| Large-scale text (at least 18pt/24 CSS px regular, or 14pt/~18.5 CSS px bold) | 3:1 | 4.5:1 |
| Required UI components and graphical objects | 3:1 | — |
| Non-essential decorations | None | None |

**The gotcha**: Placeholder text still needs 4.5:1. That light gray placeholder you see everywhere? Usually fails WCAG.

### Verify Final Colors

Calculate contrast from the colors produced by the rendering path, after gamut mapping, alpha compositing, and background resolution. Test sRGB and Display-P3 paths separately and recalculate after changing any channel. OKLCH lightness is not WCAG relative luminance or APCA Lc; chroma, hue, and gamut mapping can change the result.

APCA is polarity-sensitive: positive Lc means dark foreground on a light background; negative Lc means light foreground on a dark background. Use APCA as a supplemental design check, not a WCAG 2.2 conformance metric, and consult its current font-size/weight lookup rather than inventing fixed pass thresholds.

### Dangerous Color Combinations

These commonly fail contrast or cause readability issues:

- Light gray text on white (the #1 accessibility fail)
- **Gray text on any colored background**—gray looks washed out and dead on color. Use a darker shade of the background color, or transparency
- Red text on green background (or vice versa)—8% of men can't distinguish these
- Blue text on red background (vibrates visually)
- Yellow text on white (almost always fails)
- Thin light text on images (unpredictable contrast)

### Use Untinted Neutrals Intentionally

Tinted neutrals often create cohesion, but pure gray, black, and white remain valid when maximum contrast, imagery, print-like treatment, or an established identity calls for them. Do not tint by reflex; inspect the palette in context.

### Testing

Don't trust your eyes. Use tools:

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Browser DevTools → Rendering → Emulate vision deficiencies
- [Polypane](https://polypane.app/) for real-time testing

## Theming: Light & Dark Mode

### Dark Mode Is Not Inverted Light Mode

You can't just swap colors. Dark mode requires different design decisions:

| Light Mode | Dark Mode |
|------------|-----------|
| Shadows for depth | Lighter surfaces for depth (no shadows) |
| Dark text on light | Light text on dark (retune type on target devices) |
| Vibrant accents | Desaturate accents slightly |
| White backgrounds | Near-black surfaces by default; true black when intentional |

```css
/* Dark mode depth via surface color, not shadow */
:root[data-theme="dark"] {
  --surface-1: oklch(15% 0.01 250);
  --surface-2: oklch(20% 0.01 250);  /* "Higher" = lighter */
  --surface-3: oklch(25% 0.01 250);

  /* Tune this with the actual typeface and target display. */
  --body-weight: 400;
}
```

Light-on-dark rendering changes perceived weight differently across typefaces and displays. Tune weight, tracking, and line-height together on target devices rather than applying a universal weight direction.

### Token Hierarchy

Use two layers: primitive tokens (`--blue-500`) and semantic tokens (`--color-primary: var(--blue-500)`). Keep primitives fixed and remap semantic roles independently for dark mode. Do not mechanically reverse `50` through `950`; surfaces, accents, interaction states, and contrast requirements need role-specific choices.

```css
:root {
  --color-canvas: var(--neutral-50);
  --color-text: var(--neutral-950);
  --color-primary: var(--brand-600);
}

[data-theme="dark"] {
  --color-canvas: var(--neutral-950);
  --color-text: var(--neutral-100);
  --color-primary: var(--brand-400);
}
```

## Alpha Is A Design Smell

Heavy use of transparency (rgba, hsla) usually means an incomplete palette. Alpha creates unpredictable contrast, performance overhead, and inconsistency. Define explicit overlay colors for each context instead. Exception: focus rings and interactive states where see-through is needed.

---

**Avoid**: Relying on color alone to convey information. Creating palettes without clear roles for each color. Defaulting to pure black or white for large areas without a design reason. Skipping color blindness testing (8% of men affected).
