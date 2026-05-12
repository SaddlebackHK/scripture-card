# Fluid sizing for kiosk-class displays

## Goal

Make Landing and Card screens scale fluidly across viewport sizes — from phone (390×844) through laptop (1366×768) to portrait kiosk (1080×1920) and 4K signage. Replace fixed-pixel sizing on Landing with `clamp(min, vmin-relative-ideal, max)` and raise the existing `clamp(min, Xcqi, max)` ceilings on Card. No discrete breakpoint; every viewport gets the right scale.

## Motivation

The current Landing page uses fixed-pixel values throughout (kicker 13px, prompt 15px, button 13×16×38px, DrumPicker 92/72px wide, item height 48px). On a 1080×1920 portrait kiosk the entire interactive block occupies ~14% of the screen area, far smaller than a comfortable touch UI at that viewing distance. The Card screen is partially responsive (uses `clamp(min, Xcqi, max)`) but its ceilings cap out around 1080-wide and look small on bigger displays.

A single `@media` breakpoint would jump abruptly at the threshold and treat 1080×1920 portrait kiosks and 4K landscape signage identically. Fluid sizing scales smoothly across the entire range with one set of expressions, self-tuning to any viewport.

## Scope

### New hook

**`src/presentation/hooks/useViewport.ts`** — Live `{ width: number; height: number }` of `window.innerWidth/innerHeight`. Lazy `useState` initializer reads the dimensions synchronously on mount so the first render uses correct values. A `resize` listener updates state on changes. The hook returns the latest values for components that need numeric viewport-relative dimensions (specifically the DrumPicker).

Export it from `src/presentation/hooks/index.ts`.

### Landing page changes

**`src/presentation/pages/LandingPage.tsx`** — Call `useViewport()`, compute `vmin = Math.min(width, height)`, derive fluid DrumPicker dimensions via a JS-side `clamp(min, ideal, max)` helper, pass to the two `<DrumPicker>` elements:

| Prop | Expression |
|---|---|
| Month picker `width` | `clamp(92, 0.13 * vmin, 180)` |
| Day picker `width` | `clamp(72, 0.10 * vmin, 140)` |
| Both pickers `itemHeight` | `clamp(48, 0.072 * vmin, 88)` |

All `Math.round(...)` so DrumPicker math gets integer pixel values.

### Landing CSS changes

**`src/presentation/styles/global.css`** — Replace the fixed-pixel rules with `clamp(min, Xvmin, max)` expressions. Edits are in-place on the existing rules; no new media query block.

| Selector | Property | New value |
|---|---|---|
| `.kicker` | `font-size` | `clamp(13px, 1.4vmin, 24px)` |
| `.landing-prompt` | `font-size` | `clamp(15px, 2.5vmin, 40px)` |
| `.landing-pickers-sep` | `font-size` | `clamp(22px, 3vmin, 48px)` |
| `.landing-hero` | `max-width` | `clamp(560px, 70vmin, 1100px)` |
| `.btn-solid` | `padding` | `clamp(16px, 2vmin, 32px) clamp(38px, 5vmin, 80px)` |
| `.btn-solid` | `font-size` | `clamp(13px, 1.6vmin, 22px)` |

The `.btn-outline` rule (used elsewhere, e.g., InvalidDate fallback page) is kept fixed-px for now — it's not on the Landing page's primary path and the visual benefit is smaller. If it's ever placed on a kiosk-visible flow we can revisit.

### Card screen CSS changes

**`src/presentation/styles/global.css`** — Raise the existing `clamp` ceilings on the Card-screen rules; extend fluid sizing to the back button and action buttons.

| Selector | Property | From | To |
|---|---|---|---|
| `.card-date` | `font-size` | `clamp(18px, 3cqi, 32px)` | `clamp(18px, 3cqi, 56px)` |
| `.card-title` | `font-size` | `clamp(36px, 7.4cqi, 88px)` | `clamp(36px, 7.4cqi, 140px)` |
| `.card-verse` | `font-size` | `clamp(15px, 1.8cqi, 22px)` | `clamp(15px, 2cqi, 32px)` |
| `.card-verse` | `max-width` | `480px` | `clamp(480px, 60cqi, 880px)` |
| `.card-ref` | `font-size` | `clamp(12px, 1.4cqi, 16px)` | `clamp(12px, 1.4cqi, 26px)` |
| `.card-back` | `min-height` | `48px` | `clamp(48px, 6vmin, 72px)` |
| `.card-back` | `padding` | `12px 22px` | `clamp(12px, 1.4vmin, 22px) clamp(22px, 2.4vmin, 40px)` |
| `.card-back` | `font-size` | `12px` | `clamp(12px, 1.4vmin, 18px)` |
| `.card-back-icon` | `font-size` | `16px` | `clamp(16px, 1.8vmin, 24px)` |
| `.card-action-btn` | `width` / `height` / `min-height` | `48px` | `clamp(48px, 6vmin, 88px)` |

The `.card-screen-actions` positioning (`bottom: var(--space-5); right: var(--space-5)`) stays — that's spacing from the viewport edge and the design tokens are fine at all sizes. Same for `.card-back`'s `top`/`left` positioning.

### Why `vmin` instead of `vw` or `vh`

`vmin` = 1% of the smaller viewport axis. It naturally represents "the comfortable touch-target scale" because touch comfort relates to whichever dimension is shorter (the dimension users span with their thumb on a phone, or with arm reach on a kiosk). It produces correct scaling for both portrait and landscape without an aspect-ratio check.

`cqi` on Card stays because `.card-screen` already has `container-type: inline-size` (an existing pattern we're not refactoring).

### What stays untouched

- All design tokens (`--paper`, `--ink-*`, `--gold-*`, `--space-*`, `--radius-*`)
- The base `.page` and `.page-fit` rules (their padding stays token-based)
- The `.top-bar`, `.brand-*`, `.pill`, `.field-*`, `.banner`, `.dialog-*` rules (not on kiosk-critical flows)
- The 600/700/720px small-screen media queries — these still serve phones
- DrumPicker source code (only the props passed by LandingPage change)
- The Landing's overall layout (`page-fit` + `center-grid` + `landing-hero`) — only sizing within it changes
- Card's overall layout (`card-screen` + `card-screen-content` flex column) — only sizing changes
- `.card-screen-bg`, `.card-toast` (already gone), `.card-error-banner`
- The `.section-message` page for InvalidDate/NotFound — out of scope

### Verification

- `npm run typecheck && npm run lint && npm run build && npm test` — all green
- Manual smoke at three+ viewport sizes via DevTools device toolbar:
  - **390×844 (iPhone 14 Pro portrait)**: layout matches current; clamp `min` floors active
  - **1366×768 (laptop)**: slight bump up from `min`; layout still comfortable
  - **1080×1920 (portrait kiosk)**: significant scale-up; pickers, prompt, button all comfortably large; touch targets ≥ 60px
  - **3840×2160 (4K landscape)**: `max` ceilings active; nothing is absurdly oversized
- Spot-check the kiosk smoke by resizing the browser window through the range and confirming the transition is smooth (no abrupt jumps)

## Out of scope

- Refactoring DrumPicker to size itself from CSS (the prop-driven model with numeric math stays)
- Adding a global `--ui-scale` token system or fluid spacing tokens
- Adjusting `.btn-outline` (used in InvalidDate / NotFound fallbacks, not on Landing primary path)
- Other pages (`NotFoundPage` keeps fixed-px sizing — it's a brief error state, not a primary surface)
- Density adjustments based on physical DPR / `prefers-reduced-motion`

## Risks

- **Tuning may need iteration on a real kiosk.** Ceilings and ratios are starting points; the user may want a follow-up nudge after seeing it in production. Easier to adjust three numbers than to introduce a new system.
- **The `.landing-hero` max-width with `vmin` makes the hero column narrower in portrait than the page padding might suggest.** On 1080×1920: `70vmin = 756px`. The hero column will be 756 wide centered in 1080 — feels balanced.
- **DrumPicker `itemHeight` changing live on resize re-runs the framer-motion animations.** Not a visual problem at rest, but during a window-resize drag the wheel may "spring" briefly. Acceptable; resize is rare on kiosks.
- **`window.innerWidth/innerHeight` reads can layout-thrash on resize.** Mitigated by setState only firing on actual change; re-renders are cheap because we only pass numbers to one component.
