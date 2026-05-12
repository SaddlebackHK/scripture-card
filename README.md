# Scripture Card

React + TypeScript + Vite, structured as Clean Architecture and wired to Firebase (Firestore + Hosting).

## Layers

```
src/
├── domain/          Enterprise rules: entities, value objects, repository interfaces, domain errors.
├── application/     Use cases, input/output ports, DTOs. Depends only on domain + shared.
├── infrastructure/  Firebase, repository implementations, env config, DI composition root.
├── presentation/    React components, pages, hooks, providers, routing.
└── shared/          Layer-agnostic primitives: Result type, branded types, utils.
```

Dependency rule (enforced by ESLint via `no-restricted-imports`):

- `domain` — no inward imports
- `application` — may import `@domain`, `@shared`
- `infrastructure` — may import `@domain`, `@application`, `@shared`
- `presentation` — may import `@application`, `@domain`, `@shared`; `@infrastructure` only at the composition root (`main.tsx`)
- `shared` — no layer imports

Path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`.

## Scripts

```
npm run dev            # Vite dev server
npm run build          # type-check + production build to dist/
npm run preview        # serve the built dist/
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run lint:fix       # ESLint with --fix
npm run format         # Prettier write
npm run format:check   # Prettier check
npm run test           # Vitest run
npm run test:watch     # Vitest watch
npm run test:coverage  # Vitest with v8 coverage
npm run deploy         # build + firebase deploy (hosting + firestore)
```

## Firebase

1. Copy `.env.example` to `.env.local` and fill in the Firebase web app config.
2. Install the Firebase CLI: `npm i -g firebase-tools`, then `firebase login`.
3. Deploy:
   ```
   npm run deploy
   ```

Claim submissions land in **Firestore → claims**; only the console (or a service account) can read them. Devotional content is authored in TypeScript under `src/infrastructure/data/builtInDevotionals/` and ships with each build.

## Routes

| Path                | Description                       |
| ------------------- | --------------------------------- |
| `/`                 | Landing — pick a month and day    |
| `/card/:month/:day` | Card view + claim-by-email dialog |
