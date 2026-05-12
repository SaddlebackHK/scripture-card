# Scripture Card — coding standards for Claude

This file is loaded into every Claude Code session in this repo. Read README.md first for the
high-level architecture; this file documents the rules and gotchas that aren't obvious from
reading the code.

## Stack

React 19 · TypeScript (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`) · Vite 8 ·
React Router 7 · Firebase Auth + Firestore · Vitest + React Testing Library.

UI language is **Traditional Chinese (zh-Hant)**. New copy should match — don't translate
existing Chinese strings to English.

## Architecture (Clean Architecture, four layers)

```
domain         pure types, entities, value objects, repository interfaces, errors
application    use cases, ports (e.g. AuthService), DTOs, mappers
infrastructure Firebase implementations of repositories + ports, DI container
presentation   React components, pages, hooks, providers, routing
shared         layer-agnostic primitives (Result type, branded types)
```

**Import direction is enforced by ESLint** (`eslint.config.js` → `layerRule`). Violations
fail lint, not just review:

- `domain` imports nothing from outer layers.
- `application` may import `@domain`, `@shared` — never `@infrastructure` or `@presentation`.
- `infrastructure` may import `@domain`, `@application`, `@shared` — never `@presentation`.
- `presentation` may import `@application`, `@domain`, `@shared`. The only `@infrastructure`
  import allowed is the `Container` type at the seam (`useContainer`, `AppProvider`, `main.tsx`).
- `shared` imports nothing from any layer.

Path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`.

## TypeScript gotchas this codebase will trip you on

`tsconfig.app.json` enables several strict flags whose error messages aren't obvious:

- **`erasableSyntaxOnly`** — no constructor parameter properties (`constructor(private x: X)`)
  and no enums. Declare fields explicitly:
  ```ts
  class Foo {
    private readonly bar: Bar;
    constructor(bar: Bar) {
      this.bar = bar;
    }
  }
  ```
  Use string union types instead of enums (`type Role = 'admin' | 'reader'`).
- **`verbatimModuleSyntax`** — every type-only import must use `import type`. ESLint's
  `@typescript-eslint/consistent-type-imports` will flag missing ones.
- **`noUncheckedIndexedAccess`** — `arr[i]` is `T | undefined`. Always handle the undefined case
  (`?? fallback`, narrowing, or assertion with a comment explaining why it's safe).
- **`exactOptionalPropertyTypes`** — `{ x?: string }` and `{ x?: string | undefined }` are
  different types; assigning `undefined` to the former is an error.

## Error handling

Use cases return `Result<T, DomainError>` from `@shared/result`. **Never throw across a
use-case boundary** — branch on `result.ok`. Helpers: `ok(value)`, `err(error)`, `isOk`, `isErr`.

Domain errors extend `DomainError` and have a discriminator `kind` field
(`NotFound | Validation | Unauthorized | Unexpected`). Add new kinds in
`@domain/errors` rather than throwing generic `Error`s.

Map Firebase errors to domain errors at the infrastructure boundary
(`@infrastructure/firebase/errors.ts`). The presentation layer should never see Firebase
error codes.

## React patterns the linter enforces

- **`react-hooks/set-state-in-effect`** — never call `setState` _synchronously_ in an effect
  body. setState inside an async `.then()` callback is fine. For "reset state on input
  change" patterns, derive at render time or store the input key alongside the data
  (see `useDevotional`, `useDevotionalList` for the pattern). For form hydration on async
  load, split the component into a loader + an inner with `key={loadedId}` and lazy
  `useState(() => initialFromProps())`.
- **`@typescript-eslint/no-misused-promises`** + **`no-floating-promises`** — JSX event
  handlers expect `void`-returning functions. Wrap async work as `() => void asyncFn()` or
  use the synchronous handler that calls `.then(onResolve, onReject)`.
- **React Router 7** — `useNavigate()`'s `navigate(...)` returns a `Promise`. Prefix with
  `void`: `void navigate('/card/1/1')`.

## Component / file organization

- React Context lives in its own `*Context.ts` file separate from its provider. The provider
  goes in `*Provider.tsx`. This keeps `react-refresh/only-export-components` happy and
  preserves HMR for consumers when the provider changes.
- Pages go in `presentation/pages/`, reusable UI in `presentation/components/`, side-effect
  hooks in `presentation/hooks/`. Page-specific helpers stay in the page file.
- Index files are explicit re-exports (`export { Foo } from './Foo'`), not `export *`.

## Design system

Visual language is defined in `src/presentation/styles/global.css` as CSS custom properties.
Use the tokens — don't hardcode colors or pixel values:

### Color tokens

| Token                                  | Use                                |
| -------------------------------------- | ---------------------------------- |
| `--paper`                              | Page background                    |
| `--paper-2`                            | Card / surface background          |
| `--ink`, `--ink-2`                     | Primary / secondary body text      |
| `--ink-3`                              | Tertiary text, labels              |
| `--ink-mute`                           | Hints, placeholders                |
| `--gold`, `--gold-deep`, `--gold-soft` | Accents, links, tag chips          |
| `--rule`                               | Hairlines, dividers, input borders |
| `--shadow`                             | Elevated surfaces                  |

### Spacing scale

Every margin / padding / gap should resolve to one of these. Values not on the scale are
a smell — round to the nearest step rather than inventing a custom value.

| Token       | Pixels | Typical use                        |
| ----------- | ------ | ---------------------------------- |
| `--space-1` | 4px    | Hairline gap                       |
| `--space-2` | 8px    | Tight cluster (e.g. icon + label)  |
| `--space-3` | 12px   | Default tight                      |
| `--space-4` | 16px   | Default                            |
| `--space-5` | 24px   | Section padding, paragraph spacing |
| `--space-6` | 32px   | Between major elements             |
| `--space-7` | 48px   | Page rhythm                        |
| `--space-8` | 64px   | Hero spacing                       |

### Inline `style` is forbidden on DOM elements

Enforced by `no-restricted-syntax` in `eslint.config.js`. Use a class from `global.css`
that references the tokens. The rule matches lowercase JSX tags only — React components
and `motion.*` elements are unaffected. Override with
`// eslint-disable-next-line no-restricted-syntax -- reason` only for genuinely dynamic
values (computed dimensions, animation outputs); see `DrumPicker.tsx` for the pattern.

If you find yourself writing the same inline style twice, extract a semantic class
(`landing-hero`, `verse-block`, `editor-actions`) into `global.css` rather than repeating.

### Existing utility / semantic classes

- **Buttons**: `btn-solid`, `btn-outline`, `btn-ghost`, `pill`.
- **Surfaces**: `surface` (raised card with shadow + 1px rule border).
- **Forms**: `field`, `field-control`, `field-label`, `field-grid`, `field-help`.
- **Banners**: `banner`, `banner-error`, `banner-info`.
- **Layout**: `page`, `page-fit` (kiosk: pin to one viewport, no scroll),
  `top-bar`, `page-footer`.
- **Layout primitives**: `stack` / `stack-{2..6}`, `cluster` / `cluster-{2..4}` (with
  `cluster-justify-{center,between}`), `center-grid`, `text-center`.
- **Page sections**: `section-landing`, `section-message`.

### Fonts and theming

Fonts: **Noto Serif TC** (zh body) and **Cormorant Garamond** (`.serif-en` for Latin display).
Don't introduce new fonts.

Dark mode is real — set via `data-theme="dark"` on `<html>`, controlled by `ThemeProvider`.
Test new screens in both modes.

Responsive: mobile-first breakpoints live in `global.css`.

## Firebase + Firestore rules

Schema:

- `claims/{claimId}` — anonymous create with shape validation; reads/updates/deletes denied
  for all clients (inspect submissions via Firebase console).

Devotional content is authored as TypeScript seeds in
`src/infrastructure/data/builtInDevotionals/` (not in Firestore). The `BuiltInDevotionalSource`
port + `InMemoryBuiltInDevotionalSource` impl expose them to the app.

`firestore.rules` is the source of truth. Update it whenever you add a collection or change
the access model.

## Verification before saying "done"

Run all four when you finish a feature touching code, in order — they cover different layers:

```
npm run typecheck   # catches strict-TS issues the editor missed
npm run lint        # layer boundaries + react-hooks + prettier
npm run build       # production tsc + Vite — catches things typecheck alone misses
npm test            # Vitest
```

For UI-affecting changes, also `npm run dev` and click through the feature in a browser.
Type-checking and tests don't catch visual regressions or broken interactions.

## Things to avoid

- Adding new dependencies without checking — Firebase + React Router cover most needs.
- Mixing English and Chinese in user-facing copy unless the design intentionally pairs them
  (e.g. `kicker` Latin label above a Chinese heading).
- `console.log` — `eslint` allows only `console.warn` and `console.error`.
- Reaching into `@infrastructure` from a presentation component. If you need a side effect,
  add a use case in `@application`, wire it through the container, and call it from a hook.
