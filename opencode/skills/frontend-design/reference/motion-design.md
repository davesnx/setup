# Motion Design

## Duration: The 100/300/500 Rule

Timing matters more than easing. These durations feel right for most UI:

| Duration | Use Case | Examples |
|----------|----------|----------|
| **100-150ms** | Instant feedback | Button press, toggle, color change |
| **200-300ms** | State changes | Menu open, tooltip, hover states |
| **300-500ms** | Layout changes | Accordion, modal, drawer |
| **500-800ms** | Entrance animations | Page load, hero reveals |

**Exit animations are faster than entrances**—use ~75% of enter duration.

## Easing: Pick the Right Curve

**Don't use `ease`.** It's a compromise that's rarely optimal. Instead:

| Curve | Use For | CSS |
|-------|---------|-----|
| **ease-out** | Elements entering | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **ease-in** | Elements leaving | `cubic-bezier(0.7, 0, 0.84, 0)` |
| **ease-in-out** | State toggles (there → back) | `cubic-bezier(0.65, 0, 0.35, 1)` |

**For micro-interactions, use exponential curves**—they feel natural because they mimic real physics (friction, deceleration):

```css
/* Quart out - smooth, refined (recommended default) */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

/* Quint out - slightly more dramatic */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);

/* Expo out - snappy, confident */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

**Avoid bounce and elastic curves.** They were trendy in 2015 but now feel tacky and amateurish. Real objects don't bounce when they stop—they decelerate smoothly. Overshoot effects draw attention to the animation itself rather than the content.

## Stateful Motion Mechanics

For reversible state changes, prefer CSS transitions: a changed state retargets the transition from its current value. Reserve keyframes for one-shot sequences; use the project's motion library when presence, gestures, or coordinated layout exceed CSS.

Default-state UI must be visible and usable on first paint. Do not leave ordinary content at `opacity: 0` until hydration or an observer runs. Use `initial={false}` when mounted state should animate only after later changes; retain `initial` for intentional entrances. Reduced-motion behavior must also resolve to a visible final state.

Prefer a small fixed exit displacement. Use full-width or full-height travel only when it communicates a real spatial relationship.

### React Imports and Reduced Motion

Match the installed dependency; do not mix package names:

```tsx
// package.json contains "motion"
import { MotionConfig, motion, useReducedMotion } from "motion/react";

// package.json contains "framer-motion"
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
```

Use only one import form. With supported versions, apply the user preference at the app boundary with `<MotionConfig reducedMotion="user">`. Remove spatial transforms and filters in reduced mode, or update instantly. Functional progress and focus feedback must remain available.

### Tailwind Transition Syntax

Prefer utilities covering only the properties that change. Tailwind's `transition` is a broad default property list, not `all`; `transition-all` maps to `all`. In Tailwind v4, `transition-transform` covers `transform`, `translate`, `scale`, and `rotate`; verify generated CSS for older or customized versions.

```tsx
className="transition-[opacity,transform,scale] ease-[var(--motion-ease)] motion-reduce:transition-none"
```

Custom curves require `ease-[cubic-bezier(...)]` or `ease-[var(--motion-ease)]`. A bare `cubic-bezier(...)` string is not a Tailwind utility.

## Prefer Compositor-Friendly Properties

Start with **transform** and **opacity** because they are reliable and usually avoid layout work. Other properties can be appropriate when they materially improve the effect: bounded filters, masks, clip paths, shadows, color, or `grid-template-rows: 0fr → 1fr` for accordions. Avoid casually animating layout-driving properties such as width, height, margins, top, or left, and verify smoothness on target devices.

## Staggered Animations

Use CSS custom properties for cleaner stagger: `animation-delay: calc(var(--i, 0) * 50ms)` with `style="--i: 0"` on each item. **Cap total stagger time**—10 items at 50ms = 500ms total. For many items, reduce per-item delay or cap staggered count.

## Reduced Motion

This is not optional. Vestibular disorders affect ~35% of adults over 40.

```css
/* Define animations normally */
.card {
  animation: slide-up 500ms ease-out;
}

/* Provide alternative for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: fade-in 200ms ease-out;  /* Crossfade instead of motion */
  }
}

/* Or disable a component's non-essential motion entirely */
@media (prefers-reduced-motion: reduce) {
  .decorative-motion {
    animation: none;
    transition: none;
  }

  .spatial-motion {
    transform: none;
    filter: none;
  }
}
```

**What to preserve**: Functional animations like progress bars, loading spinners (slowed down), and focus indicators should still work—just without spatial movement.

Prefer component-specific alternatives over a universal `*` reset, which can disable functional feedback and third-party components. Remove animation delays as well as durations when an immediate final state is required.

## Perceived Performance

**Nobody cares how fast your site is—just how fast it feels.** Perception can be as effective as actual performance.

**The 80ms threshold**: Our brains buffer sensory input for ~80ms to synchronize perception. Anything under 80ms feels instant and simultaneous. This is your target for micro-interactions.

**Active vs passive time**: Passive waiting (staring at a spinner) feels longer than active engagement. Strategies to shift the balance:

- **Preemptive start**: Begin transitions immediately while loading (iOS app zoom, skeleton UI). Users perceive work happening.
- **Early completion**: Show content progressively—don't wait for everything. Video buffering, progressive images, streaming HTML.
- **Optimistic UI**: Update the interface immediately, handle failures gracefully. Instagram likes work offline—the UI updates instantly, syncs later. Use for low-stakes actions; avoid for payments or destructive operations.

**Easing affects perceived duration**: Ease-in (accelerating toward completion) makes tasks feel shorter because the peak-end effect weights final moments heavily. Ease-out feels satisfying for entrances, but ease-in toward a task's end compresses perceived time.

**Caution**: Too-fast responses can decrease perceived value. Users may distrust instant results for complex operations (search, analysis). Sometimes a brief delay signals "real work" is happening.

## Performance

Don't use `will-change` preemptively—only when animation is imminent (`:hover`, `.animating`). For scroll-triggered animations, use Intersection Observer instead of scroll events; unobserve after animating once. Create motion tokens for consistency (durations, easings, common transitions).

---

**Avoid**: Animating everything (animation fatigue is real). Using >500ms for UI feedback. Ignoring `prefers-reduced-motion`. Using animation to hide slow loading.
