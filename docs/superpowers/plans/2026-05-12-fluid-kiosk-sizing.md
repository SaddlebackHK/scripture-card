# Fluid Kiosk Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Landing and Card screens scale fluidly via `clamp(min, vmin-relative-ideal, max)` so the UI is comfortable on phones, laptops, portrait kiosks, and 4K signage — no discrete breakpoint.

**Architecture:** Two parallel tracks. CSS track: replace fixed-px sizes in Landing rules and raise the existing `clamp` ceilings on Card rules. JS track: a new `useViewport()` hook gives `LandingPage` live `{ width, height }`, used to compute fluid DrumPicker dimensions (since DrumPicker's numeric props can't be CSS-driven). The hook follows the existing `useUpdateAvailable` pattern for `useState` + `useEffect` cleanup.

**Tech Stack:** React 19, TypeScript strict, Vite 8, framer-motion (for the DrumPicker's existing motion math), Vitest. Not a git repo; commit steps optional.

**Spec:** `docs/superpowers/specs/2026-05-12-fluid-kiosk-sizing-design.md`

---

## Preflight

Confirm the baseline:

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all exit 0. Tests: 92 passing.

---

## Task 1: Create the `useViewport` hook

**Files:**
- Create: `src/presentation/hooks/useViewport.ts`
- Modify: `src/presentation/hooks/index.ts`

- [ ] **Step 1: Write `src/presentation/hooks/useViewport.ts` with EXACTLY**

```ts
import { useEffect, useState } from 'react';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

// Live viewport dimensions for components that need numeric values
// (e.g., DrumPicker whose width/itemHeight props drive motion math).
// CSS-side scaling should prefer `vmin`/`cqi` units directly; only reach
// for this hook when a numeric prop is unavoidable.
export const useViewport = (): Viewport => {
  const [size, setSize] = useState<Viewport>(() => ({
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
    height: typeof window === 'undefined' ? 768 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return size;
};
```

- [ ] **Step 2: Add the re-export to `src/presentation/hooks/index.ts`**

Append the line `export { useViewport } from './useViewport';` (and `export type { Viewport } from './useViewport';`) so the barrel becomes:

```ts
export { useContainer } from './useContainer';
export { useTheme } from './useTheme';
export { useDayParams } from './useDayParams';
export type { DayParams } from './useDayParams';
export { useDevotional } from './useDevotional';
export { useUpdateAvailable } from './useUpdateAvailable';
export { useViewport } from './useViewport';
export type { Viewport } from './useViewport';
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

---

## Task 2: Update LandingPage to compute fluid DrumPicker dimensions

**Files:**
- Modify: `src/presentation/pages/LandingPage.tsx`

- [ ] **Step 1: Replace the entire file with EXACTLY**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MONTHS, daysInMonth, formatChineseMonth } from '@shared/date';
import { DrumPicker, PageFooter, PageHeader } from '@presentation/components';
import { useViewport } from '@presentation/hooks';

const clamp = (min: number, value: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const LandingPage = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [requestedDay, setRequestedDay] = useState<number>(today.getDate());
  const { width: vw, height: vh } = useViewport();
  const vmin = Math.min(vw, vh);

  // Clamp at render time so a month change never leaves us with an out-of-range day.
  const day = Math.min(requestedDay, daysInMonth(month));
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => i + 1);

  // Fluid DrumPicker dimensions — mirrors the CSS clamp(min, Xvmin, max) pattern
  // used elsewhere, done in JS because DrumPicker's motion math needs numeric props.
  const monthWidth = Math.round(clamp(92, vmin * 0.13, 180));
  const dayWidth = Math.round(clamp(72, vmin * 0.1, 140));
  const itemHeight = Math.round(clamp(48, vmin * 0.072, 88));

  const open = () => {
    void navigate(`/card/${String(month)}/${String(day)}`);
  };

  return (
    <main className="page page-fit">
      <PageHeader />

      <section className="center-grid">
        <div className="landing-hero">
          <p className="kicker">A Word For Your Day</p>
          <p className="landing-prompt">打開你想看的一頁</p>

          <div className="surface landing-pickers">
            <DrumPicker
              ariaLabel="月份"
              items={MONTHS}
              value={month}
              onChange={setMonth}
              width={monthWidth}
              itemHeight={itemHeight}
              formatter={(m) => `${formatChineseMonth(m)}月`}
            />
            <span className="landing-pickers-sep">·</span>
            <DrumPicker
              ariaLabel="日期"
              items={days}
              value={day}
              onChange={setRequestedDay}
              width={dayWidth}
              itemHeight={itemHeight}
            />
          </div>

          <button type="button" onClick={open} className="btn-solid">
            翻開那一日 &nbsp;→
          </button>
        </div>
      </section>

      <PageFooter />
    </main>
  );
};
```

Changes vs. previous: import `useViewport` from hooks barrel; compute `vmin`, `monthWidth`, `dayWidth`, `itemHeight` via the local `clamp` helper; pass `itemHeight` to both DrumPickers (was using the DrumPicker default of 48 before).

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

---

## Task 3: Update Landing CSS to fluid clamp expressions

**Files:**
- Modify: `src/presentation/styles/global.css`

Use surgical Edit calls. Each substitution is a 1-line value change inside an existing rule.

- [ ] **Step 1: Update `.kicker` font-size**

OLD:
```css
.kicker {
  font-family: 'Cormorant Garamond', serif;
  font-size: 13px;
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0;
}
```

NEW:
```css
.kicker {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(13px, 1.4vmin, 24px);
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0;
}
```

- [ ] **Step 2: Update `.landing-prompt` font-size**

OLD:
```css
.landing-prompt {
  font-size: 15px;
  letter-spacing: 0.32em;
  color: var(--ink-3);
  margin: 0;
}
```

NEW:
```css
.landing-prompt {
  font-size: clamp(15px, 2.5vmin, 40px);
  letter-spacing: 0.32em;
  color: var(--ink-3);
  margin: 0;
}
```

- [ ] **Step 3: Update `.landing-pickers-sep` font-size**

OLD:
```css
.landing-pickers-sep {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;
  color: var(--gold);
  padding: 0 var(--space-2);
}
```

NEW:
```css
.landing-pickers-sep {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(22px, 3vmin, 48px);
  color: var(--gold);
  padding: 0 var(--space-2);
}
```

- [ ] **Step 4: Update `.landing-hero` max-width**

OLD:
```css
.landing-hero {
  width: 100%;
  max-width: var(--reading-max);
  display: grid;
  justify-items: center;
  gap: var(--space-5);
}
```

NEW:
```css
.landing-hero {
  width: 100%;
  max-width: clamp(560px, 70vmin, 1100px);
  display: grid;
  justify-items: center;
  gap: var(--space-5);
}
```

- [ ] **Step 5: Update `.btn-solid` padding + font-size**

OLD:
```css
.btn-solid {
  background: var(--ink);
  color: var(--paper);
  border: none;
  padding: 16px 38px;
  font-size: 13px;
  letter-spacing: 0.32em;
  font-family: inherit;
  transition:
    background 200ms ease,
    transform 200ms ease;
  border-radius: var(--radius-pill);
}
```

NEW:
```css
.btn-solid {
  background: var(--ink);
  color: var(--paper);
  border: none;
  padding: clamp(16px, 2vmin, 32px) clamp(38px, 5vmin, 80px);
  font-size: clamp(13px, 1.6vmin, 22px);
  letter-spacing: 0.32em;
  font-family: inherit;
  transition:
    background 200ms ease,
    transform 200ms ease;
  border-radius: var(--radius-pill);
}
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

---

## Task 4: Update Card CSS — raise clamp ceilings + fluid back-button + action-button

**Files:**
- Modify: `src/presentation/styles/global.css`

Surgical Edits inside the existing rules.

- [ ] **Step 1: Update `.card-date` ceiling**

Change `font-size: clamp(18px, 3cqi, 32px);` → `font-size: clamp(18px, 3cqi, 56px);` inside the `.card-date` rule.

OLD:
```css
.card-date {
  margin: 0;
  font-size: clamp(18px, 3cqi, 32px);
  letter-spacing: 0.06em;
  line-height: 1;
}
```

NEW:
```css
.card-date {
  margin: 0;
  font-size: clamp(18px, 3cqi, 56px);
  letter-spacing: 0.06em;
  line-height: 1;
}
```

- [ ] **Step 2: Update `.card-title` ceiling + max-width**

OLD:
```css
.card-title {
  margin: clamp(48px, 9cqi, 96px) 0 0;
  font-size: clamp(36px, 7.4cqi, 88px);
  line-height: 1.18;
  letter-spacing: 0.03em;
  font-weight: 400;
  max-width: 14ch;
}
```

NEW:
```css
.card-title {
  margin: clamp(48px, 9cqi, 96px) 0 0;
  font-size: clamp(36px, 7.4cqi, 140px);
  line-height: 1.18;
  letter-spacing: 0.03em;
  font-weight: 400;
  max-width: 16ch;
}
```

- [ ] **Step 3: Update `.card-verse` ceiling + max-width**

OLD:
```css
.card-verse {
  margin: clamp(24px, 4cqi, 48px) auto 0;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(15px, 1.8cqi, 22px);
  line-height: 1.75;
  color: #2e2620;
  max-width: 480px;
  text-wrap: pretty;
}
```

NEW:
```css
.card-verse {
  margin: clamp(24px, 4cqi, 48px) auto 0;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(15px, 2cqi, 32px);
  line-height: 1.75;
  color: #2e2620;
  max-width: clamp(480px, 60cqi, 880px);
  text-wrap: pretty;
}
```

- [ ] **Step 4: Update `.card-ref` ceiling**

OLD:
```css
.card-ref {
  margin: clamp(16px, 2.4cqi, 28px) 0 0;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(12px, 1.4cqi, 16px);
  letter-spacing: 0.08em;
  color: #4a3e30;
}
```

NEW:
```css
.card-ref {
  margin: clamp(16px, 2.4cqi, 28px) 0 0;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(12px, 1.4cqi, 26px);
  letter-spacing: 0.08em;
  color: #4a3e30;
}
```

- [ ] **Step 5: Update `.card-back` to fluid sizing**

OLD:
```css
.card-back {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 48px;
  min-width: 48px;
  padding: 12px 22px;
  background: rgba(245, 241, 234, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(20, 14, 8, 0.08);
  border-radius: var(--radius-pill);
  font-size: 12px;
  letter-spacing: 0.22em;
  color: var(--ink-2);
  text-decoration: none;
  border-bottom-color: rgba(20, 14, 8, 0.08);
  transition:
    background 200ms ease,
    color 200ms ease;
}
```

NEW:
```css
.card-back {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: clamp(48px, 6vmin, 72px);
  min-width: clamp(48px, 6vmin, 72px);
  padding: clamp(12px, 1.4vmin, 22px) clamp(22px, 2.4vmin, 40px);
  background: rgba(245, 241, 234, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(20, 14, 8, 0.08);
  border-radius: var(--radius-pill);
  font-size: clamp(12px, 1.4vmin, 18px);
  letter-spacing: 0.22em;
  color: var(--ink-2);
  text-decoration: none;
  border-bottom-color: rgba(20, 14, 8, 0.08);
  transition:
    background 200ms ease,
    color 200ms ease;
}
```

- [ ] **Step 6: Update `.card-back-icon` to fluid font-size**

OLD:
```css
.card-back-icon {
  display: inline-flex;
  font-size: 16px;
  line-height: 1;
}
```

NEW:
```css
.card-back-icon {
  display: inline-flex;
  font-size: clamp(16px, 1.8vmin, 24px);
  line-height: 1;
}
```

- [ ] **Step 7: Update `.card-action-btn` to fluid dimensions**

OLD:
```css
.card-action-btn {
  width: 48px;
  height: 48px;
  min-height: 48px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 241, 234, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(20, 14, 8, 0.08);
  border-radius: var(--radius-pill);
  color: var(--ink-2);
  border-bottom-color: rgba(20, 14, 8, 0.08);
  cursor: pointer;
  text-decoration: none;
  transition:
    background 200ms ease,
    color 200ms ease,
    border-color 200ms ease;
}
```

NEW:
```css
.card-action-btn {
  width: clamp(48px, 6vmin, 88px);
  height: clamp(48px, 6vmin, 88px);
  min-height: clamp(48px, 6vmin, 88px);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 241, 234, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(20, 14, 8, 0.08);
  border-radius: var(--radius-pill);
  color: var(--ink-2);
  border-bottom-color: rgba(20, 14, 8, 0.08);
  cursor: pointer;
  text-decoration: none;
  transition:
    background 200ms ease,
    color 200ms ease,
    border-color 200ms ease;
}
```

- [ ] **Step 8: Verify**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all exit 0. Tests: 92 passing.

---

## Task 5: Full verification gate

- [ ] **Step 1: Run the four-command gate**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: each exits 0. Tests: 92 passing.

- [ ] **Step 2: Confirm no leftover references that should have been changed**

```bash
grep -nE "font-size: 13px;|font-size: 15px;|font-size: 22px;" src/presentation/styles/global.css | head -10
```

Expected: only `.eyebrow` (font-size: 12px ≠ 13/15/22, won't match), and any rule we intentionally left fixed. Confirm visually that `.kicker`, `.landing-prompt`, `.landing-pickers-sep`, `.btn-solid` no longer use bare fixed-px font-sizes.

```bash
grep -nE "\.card-action-btn|\.card-back\b|\.card-date\b|\.card-title\b|\.card-verse\b|\.card-ref\b" src/presentation/styles/global.css
```

Expected: each rule still exists at its previous location; visual check that ceilings have changed (e.g., `clamp(18px, 3cqi, 56px)` not `32px`).

- [ ] **Step 3: Manual browser smoke test**

```bash
npm run dev
```

In a browser, use DevTools device toolbar to set these viewport sizes and confirm rendering:

1. **390×844 (iPhone 14 Pro portrait)**:
   - Landing: kicker, prompt, pickers, button all at their `min` floors (same visual as before)
   - Card `/card/5/12`: clamp floors active; layout matches current
2. **1366×768 (laptop landscape)**:
   - Landing: prompt slightly larger (~19px); pickers slightly wider; button slightly bigger padding
   - Card: bigger title and verse than before
3. **1080×1920 (portrait kiosk — use DevTools Custom)**:
   - Landing: large prompt (~27px); pickers obviously wider (~140px / ~108px); button at ~22×54 padding
   - Card: title roughly 80px; verse text comfortably large; back button and action button visibly enlarged
4. **3840×2160 (4K landscape — use DevTools Custom)**:
   - Landing: ceilings active — kicker 24px, prompt 40px, button padding 32×80, pickers 180/140 wide
   - Card: title at 140px ceiling; verse at 32px ceiling
5. **Smooth transition test**: with browser open, drag the window edge from narrow to wide and confirm fonts/sizes grow continuously, no abrupt jumps.

If anything overflows or looks broken at any of these sizes, report the size + element + what's wrong. The clamp values are starting points; they can be tuned in a follow-up.

- [ ] **Step 4: Confirm test count unchanged**

```bash
npm test 2>&1 | tail -3
```

Expected: `Tests 92 passed (92)` — no test touches viewport sizing, count stays the same.

---

## Spec coverage check

| Spec section                                              | Tasks   |
| --------------------------------------------------------- | ------- |
| New `useViewport` hook + barrel export                    | 1       |
| LandingPage uses hook, computes fluid drum dims           | 2       |
| `.kicker` font fluid                                      | 3       |
| `.landing-prompt` font fluid                              | 3       |
| `.landing-pickers-sep` font fluid                         | 3       |
| `.landing-hero` max-width fluid                           | 3       |
| `.btn-solid` padding + font fluid                         | 3       |
| `.card-date` clamp ceiling raised                         | 4       |
| `.card-title` ceiling + max-width raised                  | 4       |
| `.card-verse` ceiling + max-width fluid                   | 4       |
| `.card-ref` ceiling raised                                | 4       |
| `.card-back` size + padding + font fluid                  | 4       |
| `.card-back-icon` font fluid                              | 4       |
| `.card-action-btn` dimensions fluid                       | 4       |
| Verification: typecheck/lint/build/test + smoke at 4 sizes| 5       |
| Kept: tokens, page-fit, top-bar, drum-picker source       | (untouched) |
