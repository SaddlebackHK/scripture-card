# Scripture Card · 經文卡

A bilingual daily-devotional web app: pick a date, see the day's verse on a single shareable card, optionally request the electronic copy by email. Designed to render comfortably on everything from a phone to a kiosk-class touchscreen.

**Live:** https://scripture-card.web.app

---

## What it does

| Route               | Screen                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/`                 | **Landing** — pick a month and day on the drum picker, then open the card.                                              |
| `/card/:month/:day` | **Card** — the day's title, verse text, and reference. Tap the floating mail icon to claim an electronic copy by email. |

UI language is **Traditional Chinese (zh-Hant)**. Devotional content sourced from the 365-day OpenDoors set (`ref/content/OpenDoors 365 days.csv`) and shipped as TypeScript seeds inside the build.

---

## Stack

- **React 19** + **TypeScript** (strict; `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Vite 8** · **React Router 7** · **framer-motion** (drum picker)
- **Firebase Firestore** for anonymous claim submissions; **Firebase Hosting** for deploys
- **Vitest** + React Testing Library

---

## Quick start

Prerequisites: Node 20+, npm 10+.

```bash
git clone https://github.com/SaddlebackHK/scripture-card.git
cd scripture-card
npm install
cp .env.example .env.local      # then fill in your Firebase web app config
npm run dev                     # → http://localhost:5173
```

---

## Scripts

| Command                                                         | Purpose                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                                                   | Vite dev server with HMR                                                       |
| `npm run build`                                                 | Type-check, then production build to `dist/`                                   |
| `npm run preview`                                               | Serve the built `dist/` locally                                                |
| `npm run typecheck`                                             | `tsc -b --noEmit`                                                              |
| `npm run lint` / `npm run lint:fix`                             | ESLint (layer boundaries, react-hooks, prettier)                               |
| `npm run format` / `npm run format:check`                       | Prettier                                                                       |
| `npm run test` / `npm run test:watch` / `npm run test:coverage` | Vitest                                                                         |
| `npm run deploy`                                                | Build, then `firebase deploy --only hosting,firestore:rules,firestore:indexes` |

---

## Firebase

1. Copy `.env.example` → `.env.local` and fill in your Firebase web-app config.
2. Install the CLI: `npm i -g firebase-tools`, then `firebase login`.
3. Deploy: `npm run deploy`.

**Firestore schema** is claims-only:

- `claims/{claimId}` — anonymous create with shape validation; reads/updates/deletes denied for all clients. Inspect submissions in the Firebase console.

`firestore.rules` is the source of truth — update it when the schema or access model changes.

---

## Architecture

Clean Architecture, four layers plus a shared primitives namespace. Import direction is **enforced by ESLint** (`eslint.config.js`):

```
src/
├── domain/         Entities, value objects, repository interfaces, domain errors.
├── application/    Use cases, ports, DTOs, mappers.
├── infrastructure/ Firebase implementations, builtin devotional source, env, DI container.
├── presentation/   React components, pages, hooks, providers, routing.
└── shared/         Layer-agnostic primitives (Result type, branded types, date utils).
```

**Dependency rule:**

- `domain` — no inward imports
- `application` — may import `@domain`, `@shared`
- `infrastructure` — may import `@domain`, `@application`, `@shared`
- `presentation` — may import `@application`, `@domain`, `@shared`; the only `@infrastructure` import allowed is the `Container` type at the composition root
- `shared` — no layer imports

Path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`.

---

## Content authoring

Devotionals live in `src/infrastructure/data/builtInDevotionals/` as twelve month files (`01-january.ts` … `12-december.ts`). Each entry has the shape:

```ts
{
  month: number,
  day: number,
  dateLabel: string,   // e.g. '五月一日'
  title: string,
  verseRef: string,    // e.g. '哥林多前書13:1'
  verseTrans: string,  // e.g. '現中修訂版'
  verse: string,       // the actual scripture text with 「…」 punctuation
}
```

To edit a day, modify the TS file and redeploy. Days with no entry fall through to a generic placeholder defined in `src/application/mappers/devotionalMapper.ts`. Feb 29 mirrors Feb 28's entry so leap-year visitors see real content.

The source CSV at `ref/content/OpenDoors 365 days.csv` is the authoritative reference — re-importable via a one-shot Node script (see `docs/superpowers/plans/2026-05-12-import-opendoors-content.md`).

---

## Responsive design

The Landing and Card screens use fluid `clamp(min, vmin-or-cqi-ideal, max)` sizing so the UI scales smoothly from phone (390×844) to portrait kiosk (1080×1920) and beyond — no discrete breakpoint. Touch targets and typography both grow with the smaller viewport axis, capped at ceilings tuned for ~4K signage.

The drum picker on Landing receives its `width` / `itemHeight` as numeric React props (motion math needs numbers, not CSS strings); a small `useViewport()` hook gives the page live viewport dimensions to compute those values fluidly.

---

## Project layout

```
src/
├── App.tsx                  Root component (DI container injected from main.tsx)
├── main.tsx                 Composition root: builds container, renders <App>
├── domain/
│   ├── entities/            Devotional, ClaimRequest, value objects
│   ├── repositories/        Repository interfaces
│   └── errors/              DomainError + concrete kinds
├── application/
│   ├── use-cases/           GetDevotional, SubmitClaim, CheckForUpdate
│   ├── ports/               BuiltInDevotionalSource, VersionSource
│   ├── dto/                 DevotionalDTO, ClaimRequestDTO
│   └── mappers/             devotionalMapper
├── infrastructure/
│   ├── firebase/            App init, Firestore, error mapping
│   ├── repositories/        FirestoreClaimRepository
│   ├── data/                builtInDevotionals/ (the 12 month seed files)
│   ├── version/             HttpVersionSource for the update toast
│   ├── config/              env validation
│   └── di/                  Container, buildContainer
├── presentation/
│   ├── pages/               LandingPage, CardPage, NotFoundPage
│   ├── components/          PageHeader, ClaimDialog, DrumPicker, …
│   ├── hooks/               useDevotional, useDayParams, useViewport, useTheme, …
│   ├── providers/           DIProvider, ThemeProvider, AppProvider
│   ├── routes/              AppRouter
│   ├── styles/              global.css (design tokens + utilities)
│   ├── assets/              card-background.png
│   └── utils/               useCaseResult helpers
└── shared/
    ├── result/              Result<T, E>, ok, err, isOk, isErr, map, …
    ├── date/                Calendar + Chinese date formatters
    ├── types/               Branded type helper
    └── utils/
```

Design tokens (colors, spacing scale, radii, fonts) live as CSS custom properties at the top of `src/presentation/styles/global.css`. See `CLAUDE.md` for the coding standards and design-system contract.

---

## Design docs

Major changes ship with a spec + plan under `docs/superpowers/`:

- Specs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`

Recent specs document the auth removal, reading-view removal, Firestore-devotional removal, OpenDoors content import, and fluid kiosk sizing.
