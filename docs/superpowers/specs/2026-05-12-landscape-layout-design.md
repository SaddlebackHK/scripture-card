# Landscape-friendly layout for Landing and Card

## Goal

Make the app comfortable in landscape orientation across every viewport — from phone landscape (~844×390) to wide kiosk monitors (1920×1080+) to ultrawide displays — without breaking the portrait kiosk experience that's already dialed in.

## Motivation

Today both Landing and Card screens use `height: 100dvh; overflow: hidden`. That works on portrait kiosks but breaks in three landscape scenarios the user has confirmed:

1. **Phone landscape (~844×390)**: vertical content stack needs ~500px height; viewport is 390px → content clipped, no scroll possible
2. **Wide landscape monitor / kiosk (≥1.5:1 aspect ratio)**: vertical content sits as a narrow column in the middle of a wide canvas → looks unintentional even when nothing overflows
3. **Resized laptop window with short height**: same as phone landscape

The fix has two complementary pieces: a landscape-aware **horizontal reflow** for Landing (handles cases 1 and 2 together), and a **tighten + scroll fallback** for Card on short heights (handles case 1 for Card; cases 2–3 already work well via the existing fluid sizing).

## Scope

### Landing — horizontal reflow in landscape

When `(orientation: landscape)`, `.landing-hero` switches from its current vertical grid to a 2-column horizontal grid:

```
+----------------------------------------+
|                                        |
|   [kicker]                 [drum month]|
|   [landing-prompt]         [drum day  ]|
|                                        |
|   [button]                             |
|                                        |
+----------------------------------------+
```

Concrete CSS in `src/presentation/styles/global.css`:

```css
@media (orientation: landscape) {
  .landing-hero {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      'kicker pickers'
      'prompt pickers'
      'button pickers';
    justify-items: start;
    align-items: center;
    column-gap: var(--space-7);
    row-gap: var(--space-3);
  }
  .landing-hero > .kicker {
    grid-area: kicker;
  }
  .landing-hero > .landing-prompt {
    grid-area: prompt;
  }
  .landing-hero > .landing-pickers {
    grid-area: pickers;
    align-self: center;
  }
  .landing-hero > .btn-solid {
    grid-area: button;
    margin-top: var(--space-4);
  }
}
```

Notes:
- The existing rule's `justify-items: center` is overridden to `start` so the text/button column hugs the left edge.
- `grid-template-areas` is the cleanest way to put the pickers in a single right-side column that spans all three rows.
- The portrait `.landing-hero` rule stays exactly as-is. No `@media (orientation: portrait)` block needed; the override only applies when landscape.

Sanity-check sizes at common landscape viewports (drum dimensions come from `useViewport()` in `LandingPage`):
- Phone 844×390 (vmin=390): pickers ~240px tall, left column ~120px → fits in 390 ✓
- Laptop 1366×768 (vmin=768): pickers ~280px, left column ~180px → balanced in 768 ✓
- Kiosk landscape 1920×1080 (vmin=1080): pickers ~390px, left column ~220px → deliberate composition ✓
- Ultrawide 3440×1440 (vmin=1440): pickers ~440px (ceiling), left column ~250px → fits comfortably ✓

### Card — tighten + scroll fallback in short landscape

Card already scales well in tall landscape via `cqi`-based clamps. The problem is **short** landscape: at 844×390, `.card-screen-content`'s top+bottom padding alone (`clamp(72px, 11cqi, 160px)` + `clamp(140px, 18cqi, 240px)`) consumes ~245px of the available 390px height — title and verse spill below.

When `(max-height: 640px)`:

1. **Tighten padding**: drop both top and bottom padding ceilings significantly so content fits.

   ```css
   @media (max-height: 640px) {
     .card-screen-content {
       padding: clamp(36px, 8cqi, 96px) clamp(24px, 6cqi, 80px)
         clamp(72px, 14cqi, 140px);
     }

     .card-title {
       margin-top: clamp(24px, 5cqi, 56px);
     }
   }
   ```

   This trades some breathing room around the Saddleback wordmark area for content visibility. Acceptable trade since short-landscape isn't the kiosk's primary mode.

2. **Allow scroll as last-resort fallback**, with the bg image as a fixed backdrop so it doesn't scroll with text:

   ```css
   @media (max-height: 640px) {
     .card-screen {
       height: auto;
       min-height: 100dvh;
       overflow-y: auto;
     }
     .card-screen-bg {
       position: fixed;
     }
   }
   ```

   `.card-back` and `.card-screen-actions` remain `position: absolute` relative to `.card-screen`; on a scrolling card they stay anchored to the screen edges as expected (because they use `top` / `bottom` not relative-to-content positioning, and the user is generally not scrolling much).

   Actually — to keep the back and action buttons sticky during scroll, `position: fixed` on them is safer. Will add that to the same media query.

   ```css
   @media (max-height: 640px) {
     .card-back,
     .card-screen-actions {
       position: fixed;
     }
   }
   ```

### `.page-fit` — universal scroll fallback

Defensive change: any future page that uses `.page-fit` should also degrade gracefully on short heights.

```css
@media (max-height: 640px) {
  .page-fit {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
}
```

This way, if the Landing landscape reflow ever fails to fit (e.g., some edge case viewport), the page falls back to natural scrolling instead of clipping.

### Threshold rationale

- **`(orientation: landscape)`** applies whenever `width > height` regardless of magnitude. This covers phone landscape (844×390 = 2.16 ratio) and kiosk landscape (1920×1080 = 1.78 ratio) and ultrawide. A barely-landscape window (800×700, 1.14 ratio) also triggers — that's fine, the horizontal layout works at that aspect ratio too.
- **`(max-height: 640px)`** catches the actual overflow risk independent of orientation. 640px comfortably accommodates all common laptop browsers (768+) and excludes phone landscape (~390). Resized desktop windows below 640px height also get the fallbacks.

### What stays untouched

- Portrait kiosk layout (the original use case) — both Landing and Card
- The drum picker prop computation in `LandingPage.tsx` (already viewport-aware via `useViewport`)
- Card screen's overall design when there's enough vertical room — no 2-column split of the bg image
- All design tokens, fonts, content
- The 600/720px small-screen media queries (still serve mobile portrait correctly)

### Verification

- `npm run typecheck && npm run lint && npm run build && npm test` — all green, 92 tests passing
- Manual smoke in DevTools device toolbar:
  - **390×844 (phone portrait)** — unchanged
  - **844×390 (phone landscape)** — Landing horizontal layout; Card padding tight, content visible, fallback scroll works if a very long verse needs it
  - **1366×768 (laptop)** — Landing horizontal; Card unchanged
  - **1080×1920 (kiosk portrait)** — both unchanged from current
  - **1920×1080 (kiosk landscape)** — Landing horizontal layout; Card unchanged (tall enough to not trigger fallback)
  - **1024×500 (resized window)** — Landing horizontal + page-fit scroll fallback; Card short-height fallback active
- Drag a desktop browser window from wide → tall and back to confirm the landscape ↔ portrait swap transitions cleanly with no clipped or jumpy elements

## Out of scope

- A 2-column **Card** redesign (text-on-left + image-on-right). The current full-bleed bg with overlay text is the signature visual; not changing it.
- Changing the drum picker's visible item count (`visibleItems` stays 5). Reducing to 3 in short landscape would tighten further but changes the wheel's character.
- Adding orientation-locked CSS for the Saddleback wordmark area at the bottom of the bg image — the tightened bottom padding may slightly overlap on short-landscape, but the wordmark isn't a regulatory element.
- Reformatting the `useViewport` hook to also expose `aspect-ratio` (no consumer needs it yet; can add later if a JS-side branch becomes necessary).

## Risks

- **`(orientation: landscape)` applies to barely-landscape windows.** A 800×700 desktop window enters the horizontal layout. This is intentional but worth noting — the layout still works there.
- **Tightened Card padding on short landscape can overlap the Saddleback wordmark area on the bg image.** This is a known trade-off in favor of content visibility. If the wordmark needs to remain clear, a follow-up could fade or hide it via a CSS overlay in short landscape.
- **`position: fixed` on `.card-back` and `.card-screen-actions` in short landscape** changes their positioning context from the card-screen container to the viewport. In practice, with the buttons hugging viewport corners (`top: var(--space-4); left: var(--space-4)` etc.), this produces the same visual result. Worth visually checking during the smoke test.
- **The `(max-height: 640px)` threshold may need tuning.** If a future device or unusual window size falls just inside or outside it, the fallback may not trigger when expected or trigger when not needed. Adjustable in one place.
