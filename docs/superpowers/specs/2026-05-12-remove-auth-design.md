# Remove authentication

## Goal

Strip Firebase Auth and the admin functionality it gated from Scripture Card. The app becomes a read-only public devotional viewer with an anonymous claim-by-email flow. Devotional content is edited directly in the Firebase console; claim submissions are reviewed there too.

## Motivation

Auth in this codebase exists only to gate `/admin*`. Removing it shrinks the surface area significantly (Firebase Auth SDK, user repo, sign-in flow, admin pages, role concept) and removes the operational burden of managing admin accounts. Editing devotionals via the console is acceptable for the project's scale.

## Scope

### Removed

**Presentation**

- `presentation/pages/SignInPage.tsx`
- `presentation/pages/AdminPage.tsx`
- `presentation/pages/AdminEditorPage.tsx`
- `presentation/components/AdminGate.tsx`
- `presentation/providers/AuthProvider.tsx`
- `presentation/providers/AuthContext.ts`
- `presentation/hooks/useAuth.ts`
- The `/sign-in`, `/admin`, `/admin/:month/:day` routes in `presentation/routes/AppRouter.tsx`
- Sign-in / sign-out / admin nav links and the `LogIn` icon import in `presentation/components/PageHeader.tsx`
- The `<AuthProvider>` wrapper in `presentation/providers/AppProvider.tsx`
- Corresponding re-exports from `presentation/pages/index.ts`, `presentation/components/index.ts`, `presentation/hooks/index.ts`, `presentation/providers/index.ts`

**Application**

- `application/use-cases/SignInWithEmail.ts`
- `application/use-cases/SignInWithGoogle.ts`
- `application/use-cases/SignUpWithEmail.ts`
- `application/use-cases/SignOut.ts`
- `application/use-cases/SaveDevotional.ts`
- `application/use-cases/DeleteDevotional.ts`
- `application/ports/AuthService.ts`
- `application/dto/AuthDTO.ts`
- `application/mappers/authMapper.ts`
- Their entries in `application/use-cases/index.ts`, `application/ports/index.ts`, `application/dto/index.ts`

**Infrastructure**

- `infrastructure/auth/FirebaseAuthService.ts`
- `infrastructure/auth/index.ts`
- `infrastructure/firebase/auth.ts` and its re-export from `infrastructure/firebase/index.ts`
- `infrastructure/repositories/FirestoreUserRepository.ts` and its barrel export
- `mapFirebaseAuthError`, the `AUTH_MESSAGES` table, and matching test cases in `infrastructure/firebase/errors.ts` / `errors.test.ts`
- The `save` and `delete` methods of `FirestoreDevotionalRepository`
- In `infrastructure/di/container.ts`: the `authService` field, `FirebaseAuthService` wiring, `FirestoreUserRepository` wiring, and the `signInWithGoogle` / `signInWithEmail` / `signUpWithEmail` / `signOut` / `saveDevotional` / `deleteDevotional` `UseCases` fields

**Domain**

- `domain/entities/User.ts`
- `domain/repositories/UserRepository.ts`
- `AuthenticationError` from `domain/errors/DomainError.ts`
- The `save` and `delete` methods on the `DevotionalRepository` interface
- Their barrel entries

**Config**

- `firestore.rules`: the entire `match /users/{uid} { ... }` block; the `create | update | delete` rules under `match /devotionals/{key}` (so client writes are denied by default); the admin-only `read | update | delete` rules under `match /claims/{claimId}` (so claim reads are denied by default)
- `README.md`: the "Enable Email/Password and Google sign-in providers" step, the "Granting the first admin" section, and the `/sign-in` / `/admin` / `/admin/:month/:day` rows of the routes table
- `CLAUDE.md`: the `users/{uid}` line of the "Firebase + Firestore rules" schema list and the bootstrap admin sentence

### Kept

- All public reading flow (`LandingPage`, `CardPage`, `ReadingPage`, `NotFoundPage`).
- `ClaimDialog` and its `SubmitClaim` use case + `FirestoreClaimRepository` + `ClaimRequest` entity.
- Read-side of devotionals: `GetDevotional`, `ListDevotionals`, the read methods of `DevotionalRepository` / `FirestoreDevotionalRepository`.
- Update toast / `CheckForUpdate` / version source.
- Theme provider, design system, all shared utils.
- `UnauthorizedError` in `domain/errors/DomainError.ts` — Firestore can still emit `permission-denied` for default-deny paths and `mapFirestoreError` keeps mapping it.
- `firebase` npm dependency (Firestore still needs it).
- The `authDomain` field of `FirebaseEnv` and its `VITE_FIREBASE_AUTH_DOMAIN` env var — the Firebase JS SDK requires `authDomain` during app initialization even when Auth is not used.

## Firestore rules after removal

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /devotionals/{key} {
      allow read: if true;
    }

    match /claims/{claimId} {
      function validClaim() {
        let data = request.resource.data;
        return data.keys().hasOnly(['name', 'email', 'phone', 'month', 'day', 'createdAt'])
          && data.keys().hasAll(['name', 'email', 'month', 'day', 'createdAt'])
          && data.name is string && data.name.size() >= 1 && data.name.size() <= 60
          && data.email is string && data.email.size() >= 3 && data.email.size() <= 254
          && data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
          && (!('phone' in data) || data.phone == null
              || (data.phone is string && data.phone.size() >= 5 && data.phone.size() <= 20))
          && data.month is int && data.month >= 1 && data.month <= 12
          && data.day is int && data.day >= 1 && data.day <= 31
          && data.createdAt == request.time;
      }

      allow create: if validClaim();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Architecture after removal

```
domain
  entities/        Devotional, ClaimRequest, DayKey
  repositories/    DevotionalRepository (read-only), ClaimRepository
  errors/          NotFound, Validation, Unauthorized, Unexpected

application
  use-cases/       GetDevotional, ListDevotionals, SubmitClaim, CheckForUpdate
  ports/           BuiltInDevotionalSource, VersionSource
  dto/             ClaimDTO, DevotionalDTO
  mappers/         devotionalMapper

infrastructure
  firebase/        firebaseApp, firestore, errors (Firestore-only)
  repositories/    FirestoreDevotionalRepository (read-only), FirestoreClaimRepository
  data/            InMemoryBuiltInDevotionalSource
  version/         HttpVersionSource
  config/          env
  di/              Container { firestore, useCases }

presentation
  pages/           LandingPage, CardPage, ReadingPage, NotFoundPage
  components/      Brand, PageHeader, PageFooter, DrumPicker, ClaimDialog, DateTag, ThemeToggle, UpdateToast
  hooks/           useContainer, useDevotional, useDevotionalList, useDayParams, useTheme, useUpdateAvailable
  providers/       DIProvider, ThemeProvider, AppProvider
  routes/          AppRouter (/, /card/:m/:d, /read/:m/:d, *)
  styles, utils, assets
```

The `Container` interface narrows from `{ firestore, authService, useCases }` to `{ firestore, useCases }`. `useCases` narrows to `{ getDevotional, listDevotionals, submitClaim, checkForUpdate }`.

## Order of execution

The repo enforces import direction with ESLint (`presentation → application → domain` only), so we remove from the outermost layer inward. Typecheck after each step; errors at the next layer in are expected and serve as a checklist.

1. **Presentation** — delete files listed above, edit `AppRouter`, `PageHeader`, `AppProvider`, barrels.
2. **Infrastructure** — delete `infrastructure/auth/`, `firebase/auth.ts`, `FirestoreUserRepository`; trim `FirestoreDevotionalRepository` to read-only; update `container.ts`, `firebase/index.ts`, `firebase/errors.ts` (+ its test), repositories barrel.
3. **Application** — delete the six use cases listed, `AuthService` port, `AuthDTO`, `authMapper`; update barrels.
4. **Domain** — delete `User.ts`, `UserRepository.ts`, `AuthenticationError`; trim `DevotionalRepository` interface; update barrels.
5. **Config & docs** — update `firestore.rules`, `README.md`, `CLAUDE.md`.
6. **Verify** — `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`. Then `npm run dev` and exercise: Landing → Card → ClaimDialog (submit + close + ESC) → Reading, in light and dark mode.

## Risks and known consequences

- **Existing production data is not migrated.** The `users/` Firestore collection becomes orphaned after this change deploys. It can be deleted manually via the console. No code references it after the change.
- **Claim submissions are no longer viewable in-app.** They land in the `claims` collection and must be inspected via the Firebase console or a service-account script. (This was already the case — only admins could read claims — so there is no behavioral regression for end users.)
- **Devotional editing moves out of the app entirely.** Adding or updating a `devotionals/MM-DD` document requires console access or a CLI script. This is the explicit trade we accepted by choosing "Remove admin entirely".
- **Rules deploy timing.** The new `firestore.rules` ship via `npm run deploy`. Until that deploy lands, the live rules still permit admin writes from anyone holding an admin token. No code path in the deployed bundle exercises that after the change, so the practical risk is low, but the rules deploy should not be deferred.
- **No new dependencies and no removed dependencies.** `firebase` stays for Firestore.

## Out of scope

- Migrating existing `users/` documents.
- Adding a CLI or script for editing devotionals.
- Adjusting `claims` retention or adding a notification webhook.
- Any visual / design changes to the public pages.
