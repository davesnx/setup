# Interaction Design

## The Eight Interactive States

Every interactive element needs these states designed:

| State | When | Visual Treatment |
|-------|------|------------------|
| **Default** | At rest | Base styling |
| **Hover** | Pointer over (not touch) | Subtle lift, color shift |
| **Focus** | Keyboard/programmatic focus | Visible ring (see below) |
| **Active** | Being pressed | Pressed in, darker |
| **Disabled** | Not interactive | Reduced opacity, no pointer |
| **Loading** | Processing | Spinner, skeleton |
| **Error** | Invalid state | Red border, icon, message |
| **Success** | Completed | Green check, confirmation |

**The common miss**: Designing hover without focus, or vice versa. They're different. Keyboard users never see hover states.

## Focus Rings: Do Them Right

**Never `outline: none` without replacement.** It's an accessibility violation. Instead, use `:focus-visible` to show focus only for keyboard users:

```css
/* Hide focus ring for mouse/touch */
button:focus {
  outline: none;
}

/* Show focus ring for keyboard */
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

**Focus ring design**:
- High contrast (3:1 minimum against adjacent colors)
- 2-3px thick
- Offset from element (not inside it)
- Consistent across all interactive elements

## Icon-Only and State-Swapping Controls

Every icon-only control needs an accessible name. Put semantics on the control and mark visual icons `aria-hidden="true"`; raw SVGs must not be keyboard-focusable.

For a true toggle, keep its name stable and expose state with `aria-pressed`. If the available action changes, such as Play/Pause, update the name to the action currently available. When two icons remain mounted for animation, hide their shared wrapper once so neither icon is announced.

```tsx
<button type="button" aria-label="Favorite" aria-pressed={isFavorite}>
  <span aria-hidden="true">
    {isFavorite ? <FilledHeartIcon /> : <HeartIcon />}
  </span>
</button>
```

## Form Design: The Non-Obvious

**Placeholders aren't labels**—they disappear on input. Always use visible `<label>` elements. **Validate on blur**, not on every keystroke (exception: password strength). Place errors **below** fields with `aria-describedby` connecting them.

## Loading States

**Optimistic updates**: Show success immediately, rollback on failure. Use for low-stakes actions (likes, follows), not payments or destructive actions. **Skeleton screens > spinners**—they preview content shape and feel faster than generic spinners.

## Modal Dialogs

Use the native `<dialog>` element with `showModal()`. Do not add `open` directly for a modal: `showModal()` puts the dialog in the top layer and makes the rest of the document inert while it is open.

```html
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Modal title</h2>
  <form method="dialog">
    <button value="cancel">Cancel</button>
  </form>
</dialog>
```

```javascript
const dialog = document.querySelector('dialog');
dialog.showModal();
```

Choose initial focus deliberately, keep the dialog labeled, provide an explicit close action, and restore focus to the opener. Escape closes a modal dialog unless the interaction intentionally prevents cancellation.

## The Popover API

For tooltips, dropdowns, and non-modal overlays, use native popovers:

```html
<button popovertarget="menu">Open menu</button>
<div id="menu" popover>
  <button>Option 1</button>
  <button>Option 2</button>
</div>
```

**Benefits**: Top-layer stacking, light-dismiss behavior for `popover="auto"`, and no z-index wars. Popovers do not supply menu, listbox, or tooltip semantics or their keyboard behavior; implement the appropriate ARIA pattern for the content.

## Destructive Actions: Undo > Confirm

**Undo is better than confirmation dialogs**—users click through confirmations mindlessly. Remove from UI immediately, show undo toast, actually delete after toast expires. Use confirmation only for truly irreversible actions (account deletion), high-cost actions, or batch operations.

## Keyboard Navigation Patterns

### Roving Tabindex

For component groups (tabs, menu items, radio groups), one item is tabbable; arrow keys move within:

```html
<div role="tablist">
  <button role="tab" tabindex="0">Tab 1</button>
  <button role="tab" tabindex="-1">Tab 2</button>
  <button role="tab" tabindex="-1">Tab 3</button>
</div>
```

Arrow keys move `tabindex="0"` between items. Tab moves to the next component entirely.

### Skip Links

Provide skip links (`<a href="#main-content">Skip to main content</a>`) for keyboard users to jump past navigation. Hide off-screen, show on focus.

## Gesture Discoverability

Swipe-to-delete and similar gestures are invisible. Hint at their existence:

- **Partially reveal**: Show delete button peeking from edge
- **Onboarding**: Coach marks on first use
- **Alternative**: Always provide a visible fallback (menu with "Delete")

Don't rely on gestures as the only way to perform actions.

---

**Avoid**: Removing focus indicators without alternatives. Using placeholder text as labels. Touch targets <44x44px. Generic error messages. Custom controls without ARIA/keyboard support.
