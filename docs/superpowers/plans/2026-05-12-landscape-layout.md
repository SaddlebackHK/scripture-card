# Landscape Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add landscape-aware CSS so Landing reflows to a 2-column horizontal layout in landscape orientation and Card screen survives short heights via tighter padding + scroll fallback, while leaving portrait kiosk experience untouched.

**Architecture:** Pure CSS change — three new `@media` blocks appended to `src/presentation/styles/global.css`. No source code or hook changes. One `@media (orientation: landscape)` rule reshapes `.landing-hero` into a 2-column grid. One `@media (max-height: 640px)` rule tightens Card padding and switches to scroll-fallback mode. The same `(max-height: 640px)` rule also lifts `.page-fit`'s no-scroll constraint as a defensive fallback.

**Tech Stack:** Pure CSS (no JS or TS changes). Vitest stays green because no test touches these styles.

**Spec:** `docs/superpowers/specs/2026-05-12-landscape-layout-design.md`

---

## Preflight

Confirm the baseline:

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all exit 0. Tests: 92 passing.

---

## Task 1: Landing horizontal reflow in landscape

**Files:**
- Modify: `src/presentation/styles/global.css` (append a new `@media` block)

- [ ] **Step 1: Locate the existing `.landing-hero` rule**

Run to confirm its location and current state:

```bash
grep -n "^\.landing-hero" src/presentation/styles/global.css
```

Expected: one match (around line 749). Verify its current body has `display: grid; justify-items: center; gap: var(--space-5);` and `max-width: clamp(560px, 70vmin, 1100px);` from the earlier fluid-sizing change. Do NOT modify this base rule — the new override below sits in a media query.

- [ ] **Step 2: Append the landscape override to `global.css`**

Find the existing landing-related CSS section (around `/* ─── Landing page ─── */` near line 745). Append a new block immediately after the existing `.landing-pickers-sep` rule (or anywhere within the Landing section). Use Edit with the following exact insertion:

OLD (the closing of the `.landing-pickers-sep` rule):
```css
.landing-pickers-sep {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(22px, 3vmin, 48px);
  color: var(--gold);
  padding: 0 var(--space-2);
}
```

NEW (the same rule, followed by the new landscape override):
```css
.landing-pickers-sep {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(22px, 3vmin, 48px);
  color: var(--gold);
  padding: 0 var(--space-2);
}

/* Landscape reflow — kicker / prompt / button stacked on the left, drum
   pickers on the right. Applies whenever width > height, which covers
   phone landscape, laptop landscape, kiosks mounted horizontally, and
   ultrawide monitors. Portrait keeps the original centered stack. */
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

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

---

## Task 2: Card screen short-height adaptations

**Files:**
- Modify: `src/presentation/styles/global.css` (append a new `@media` block)

- [ ] **Step 1: Locate the Card-screen section**

```bash
grep -n "^\.card-screen\b" src/presentation/styles/global.css
```

Expected: one match (around line 841). Note the location of the existing `@media (max-width: 720px)` block that targets `.card-back` (used for icon-only collapse on narrow viewports — leave it alone). The new `@media (max-height: 640px)` block goes after that.

- [ ] **Step 2: Append the short-height override**

Find this existing `@media (max-width: 720px)` block (around line 1037):

```css
/* Back button (top-left) keeps its responsive label behavior —
   labeled pill on wide screens, icon-only square on phones. */
@media (max-width: 720px) {
  .card-back {
    padding: 14px;
    gap: 0;
    justify-content: center;
  }

  .card-back-label {
    display: none;
  }
}
```

Append the new short-height block immediately after its closing `}`:

```css
/* Short-height fallback — phone in landscape (e.g., 844×390) or any
   resized window below 640px tall. Tightens Card padding so the title /
   verse / ref fit, switches the page to scroll mode with the bg image
   as a fixed backdrop, and pins the back / action buttons to the viewport
   corners so they remain reachable while scrolling. */
@media (max-height: 640px) {
  .card-screen {
    height: auto;
    min-height: 100dvh;
    overflow-y: auto;
  }

  .card-screen-bg {
    position: fixed;
  }

  .card-screen-content {
    padding: clamp(36px, 8cqi, 96px) clamp(24px, 6cqi, 80px) clamp(72px, 14cqi, 140px);
  }

  .card-title {
    margin-top: clamp(24px, 5cqi, 56px);
  }

  .card-back,
  .card-screen-actions {
    position: fixed;
  }
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

---

## Task 3: `.page-fit` scroll fallback for short heights

**Files:**
- Modify: `src/presentation/styles/global.css`

- [ ] **Step 1: Locate the existing `.page-fit` rules**

```bash
grep -n "^\.page-fit" src/presentation/styles/global.css
```

Expected: matches at `.page-fit`, `.page-fit > *`, and `.page-fit .page-footer` (around lines 253-267).

- [ ] **Step 2: Append the short-height fallback after the existing `.page-fit .page-footer` rule**

Find this block (around line 265):

```css
.page-fit .page-footer {
  margin-top: var(--space-2);
}

@media (max-width: 720px) {
  .page {
    padding: 20px 18px 28px;
  }
}
```

Insert a new `@media (max-height: 640px)` block between the `.page-fit .page-footer` rule and the existing `@media (max-width: 720px)` block:

```css
.page-fit .page-footer {
  margin-top: var(--space-2);
}

/* Short-height fallback — defensive: any .page-fit page falls back to
   natural document scrolling when the viewport is too short to fit the
   no-scroll layout. Currently applies to Landing in landscape on a phone
   or a resized window. */
@media (max-height: 640px) {
  .page-fit {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
}

@media (max-width: 720px) {
  .page {
    padding: 20px 18px 28px;
  }
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

---

## Task 4: Full verification gate

- [ ] **Step 1: Run the four-command gate**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: each exits 0. Tests: 92 passing. Bundle size unchanged (~701 KB JS, ~17.5 KB CSS — these are CSS-only additions).

- [ ] **Step 2: Confirm the new media-query blocks are present**

```bash
grep -nE "@media \(orientation: landscape\)|@media \(max-height: 640px\)" src/presentation/styles/global.css
```

Expected: exactly 3 matches — one `(orientation: landscape)` and two `(max-height: 640px)`.

- [ ] **Step 3: Sanity-check the CSS counts**

```bash
echo "landscape rules:"; grep -c "grid-area:" src/presentation/styles/global.css
echo "short-height rules:"; grep -c "position: fixed" src/presentation/styles/global.css
```

Expected: at least 4 `grid-area:` declarations (from Task 1) and at least 2 `position: fixed` declarations (from Task 2 — `card-screen-bg` and `card-back, card-screen-actions`). Other matches in the file are fine.

---

## Task 5: Manual smoke test (controller runs)

The implementing agent cannot drive a browser. The controller (running this plan via Subagent-Driven Development) needs to do a manual smoke pass, or hand it off to the human.

Test viewports via DevTools device toolbar:

| Viewport | Expected behavior |
| --- | --- |
| **390×844 phone portrait** | Landing: unchanged vertical stack. Card: unchanged. |
| **844×390 phone landscape** | Landing: 2-column horizontal layout (kicker/prompt/button left, pickers right). Card: tight padding + scroll fallback active; back button + Mail button pinned to viewport corners; bg image fixed as backdrop. |
| **1366×768 laptop landscape** | Landing: 2-column horizontal layout. Card: unchanged (height > 640 so fallback doesn't trigger). |
| **1080×1920 kiosk portrait** | Both unchanged from current (portrait keeps vertical stack). |
| **1920×1080 kiosk landscape** | Landing: 2-column horizontal layout, deliberately composed. Card: unchanged (height 1080 > 640). |
| **1024×500 resized window** | Landing: 2-column horizontal + `.page-fit` scroll fallback if needed. Card: short-height fallback active. |

Drag a desktop browser window from wide → tall → wide and confirm the transition is smooth, no clipped or jumpy elements.

---

## Spec coverage check

| Spec section                                                | Tasks |
| ----------------------------------------------------------- | ----- |
| Landing horizontal reflow CSS (grid template + areas)       | 1     |
| Card short-height: tighter padding                          | 2     |
| Card short-height: scroll fallback (overflow-y: auto)       | 2     |
| Card short-height: bg fixed                                 | 2     |
| Card short-height: back/action buttons pinned via fixed     | 2     |
| `.page-fit` short-height scroll fallback                    | 3     |
| Full gate (typecheck + lint + build + test)                 | 4     |
| Browser smoke test at 6 viewport sizes                      | 5     |
| Kept untouched: portrait kiosk, drum picker logic, content  | (none — no task needed) |
