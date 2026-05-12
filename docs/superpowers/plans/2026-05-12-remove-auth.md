# Remove Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete Firebase Auth and admin functionality from Scripture Card. The app becomes a read-only public devotional viewer with an anonymous claim-by-email flow.

**Architecture:** Clean Architecture — `domain → application → infrastructure → presentation`, import direction enforced by ESLint. Removal proceeds outside-in (presentation → infrastructure-wiring → application → domain interface/impl trim → domain auth) so every checkpoint leaves the build green. The one non-obvious ordering rule: `DevotionalRepository.save`/`delete` and their `FirestoreDevotionalRepository` implementations can only be trimmed **after** `SaveDevotional` / `DeleteDevotional` use cases (their only callers) are deleted.

**Tech Stack:** React 19, TypeScript (strict + `erasableSyntaxOnly` + `verbatimModuleSyntax`), Vite 8, React Router 7, Firebase (Firestore only after this change), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-12-remove-auth-design.md`

---

## Preflight

The working directory is not a git repo today. Commit boundaries below are written as `git commit` commands but they're optional checkpoint markers — if you don't `git init` first, just skip them. To enable commits:

```bash
git init && git add -A && git commit -m "chore: snapshot before auth removal"
```

Verify the baseline is green before changing anything:

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three exit 0.

---

## Phase 1 — Presentation

### Task 1: Delete presentation auth/admin files

**Files:**

- Delete: `src/presentation/pages/SignInPage.tsx`
- Delete: `src/presentation/pages/AdminPage.tsx`
- Delete: `src/presentation/pages/AdminEditorPage.tsx`
- Delete: `src/presentation/components/AdminGate.tsx`
- Delete: `src/presentation/providers/AuthProvider.tsx`
- Delete: `src/presentation/providers/AuthContext.ts`
- Delete: `src/presentation/hooks/useAuth.ts`

- [ ] **Step 1: Delete the files**

```bash
rm src/presentation/pages/SignInPage.tsx \
   src/presentation/pages/AdminPage.tsx \
   src/presentation/pages/AdminEditorPage.tsx \
   src/presentation/components/AdminGate.tsx \
   src/presentation/providers/AuthProvider.tsx \
   src/presentation/providers/AuthContext.ts \
   src/presentation/hooks/useAuth.ts
```

No verify step here — typecheck is intentionally red until Task 2 updates the barrels.

### Task 2: Update presentation barrels

**Files:**

- Modify: `src/presentation/pages/index.ts`
- Modify: `src/presentation/components/index.ts`
- Modify: `src/presentation/hooks/index.ts`
- Modify: `src/presentation/providers/index.ts`

- [ ] **Step 1: Rewrite `src/presentation/pages/index.ts`**

```ts
export { LandingPage } from './LandingPage';
export { CardPage } from './CardPage';
export { ReadingPage } from './ReadingPage';
export { NotFoundPage } from './NotFoundPage';
```

- [ ] **Step 2: Rewrite `src/presentation/components/index.ts`**

```ts
export { Brand } from './Brand';
export { ThemeToggle } from './ThemeToggle';
export { PageHeader } from './PageHeader';
export { PageFooter } from './PageFooter';
export { DateTag } from './DateTag';
export { DrumPicker } from './DrumPicker';
export { ClaimDialog } from './ClaimDialog';
export { UpdateToast } from './UpdateToast';
```

- [ ] **Step 3: Rewrite `src/presentation/hooks/index.ts`**

```ts
export { useContainer } from './useContainer';
export { useTheme } from './useTheme';
export { useDayParams } from './useDayParams';
export type { DayParams } from './useDayParams';
export { useDevotional } from './useDevotional';
export { useDevotionalList } from './useDevotionalList';
export { useUpdateAvailable } from './useUpdateAvailable';
```

- [ ] **Step 4: Rewrite `src/presentation/providers/index.ts`**

```ts
export { AppProvider } from './AppProvider';
export { DIProvider } from './DIProvider';
export { DIContext } from './DIContext';
export { ThemeProvider } from './ThemeProvider';
export { ThemeContext } from './ThemeContext';
export type { Theme, ThemeContextValue } from './ThemeContext';
```

### Task 3: Strip /sign-in and /admin routes from AppRouter

**Files:**

- Modify: `src/presentation/routes/AppRouter.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { Route, Routes } from 'react-router-dom';
import { CardPage, LandingPage, NotFoundPage, ReadingPage } from '@presentation/pages';

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/card/:month/:day" element={<CardPage />} />
    <Route path="/read/:month/:day" element={<ReadingPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
```

### Task 4: Strip auth nav from PageHeader

**Files:**

- Modify: `src/presentation/components/PageHeader.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { type ReactNode } from 'react';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

export interface PageHeaderProps {
  readonly leading?: ReactNode;
  // When provided, replaces the default trailing nav (theme toggle).
  // Pass `null` to hide trailing entirely.
  readonly trailing?: ReactNode;
}

export const PageHeader = ({ leading, trailing }: PageHeaderProps) => (
  <header className="top-bar">
    {leading ?? <Brand />}
    <nav className="top-bar-tools" aria-label="primary">
      {trailing ?? <ThemeToggle />}
    </nav>
  </header>
);
```

### Task 5: Remove AuthProvider from AppProvider

**Files:**

- Modify: `src/presentation/providers/AppProvider.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { Container } from '@infrastructure/di';
import { DIProvider } from './DIProvider';
import { ThemeProvider } from './ThemeProvider';

export interface AppProviderProps {
  readonly container: Container;
  readonly children: ReactNode;
}

export const AppProvider = ({ container, children }: AppProviderProps) => (
  <DIProvider container={container}>
    <ThemeProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </ThemeProvider>
  </DIProvider>
);
```

- [ ] **Step 2: Checkpoint commit (optional)**

```bash
git add -A && git commit -m "refactor(presentation): remove auth + admin UI"
```

Typecheck is intentionally still red — the DI container in infrastructure references types and use cases that the new presentation no longer needs but that still exist. Phase 2 fixes that.

---

## Phase 2 — Infrastructure wiring

We update the container first (so it stops referencing auth-side wiring), then delete the now-orphaned auth wiring files, then strip the Firebase Auth error mapper. After Phase 2 the build is green; the `application` layer still contains dead-but-self-consistent auth code that Phase 3 deletes.

### Task 6: Update the DI container

**Files:**

- Modify: `src/infrastructure/di/container.ts`

- [ ] **Step 1: Replace the entire file contents**

```ts
import type { Firestore } from 'firebase/firestore';
import {
  CheckForUpdate,
  GetDevotional,
  ListDevotionals,
  SubmitClaim,
} from '@application/use-cases';
import { firestore } from '@infrastructure/firebase';
import {
  FirestoreClaimRepository,
  FirestoreDevotionalRepository,
} from '@infrastructure/repositories';
import { InMemoryBuiltInDevotionalSource } from '@infrastructure/data/builtInDevotionals';
import { HttpVersionSource } from '@infrastructure/version/HttpVersionSource';

export interface UseCases {
  readonly getDevotional: GetDevotional;
  readonly listDevotionals: ListDevotionals;
  readonly submitClaim: SubmitClaim;
  readonly checkForUpdate: CheckForUpdate;
}

export interface Container {
  readonly firestore: Firestore;
  readonly useCases: UseCases;
}

export const buildContainer = (): Container => {
  const devotionalRepo = new FirestoreDevotionalRepository(firestore);
  const claimRepo = new FirestoreClaimRepository(firestore);
  const builtInDevotionals = new InMemoryBuiltInDevotionalSource();
  const versionSource = new HttpVersionSource();

  const useCases: UseCases = {
    getDevotional: new GetDevotional(devotionalRepo, builtInDevotionals),
    listDevotionals: new ListDevotionals(devotionalRepo),
    submitClaim: new SubmitClaim(claimRepo),
    checkForUpdate: new CheckForUpdate(versionSource, __APP_VERSION__),
  };

  return { firestore, useCases };
};
```

After this step `Container` no longer references `authService` or any sign-in/out/save/delete use case. The orphaned `infrastructure/auth/`, `firebase/auth.ts`, `FirestoreUserRepository.ts` files still exist and still compile internally — Task 7 deletes them.

### Task 7: Delete orphaned Firebase Auth wiring

**Files:**

- Delete: `src/infrastructure/auth/FirebaseAuthService.ts`
- Delete: `src/infrastructure/auth/index.ts`
- Delete: `src/infrastructure/firebase/auth.ts`
- Delete: `src/infrastructure/repositories/FirestoreUserRepository.ts`
- Modify: `src/infrastructure/firebase/index.ts`
- Modify: `src/infrastructure/repositories/index.ts`

- [ ] **Step 1: Delete files**

```bash
rm -r src/infrastructure/auth
rm src/infrastructure/firebase/auth.ts
rm src/infrastructure/repositories/FirestoreUserRepository.ts
```

- [ ] **Step 2: Rewrite `src/infrastructure/firebase/index.ts`**

```ts
export { firebaseApp } from './firebaseApp';
export { firestore } from './firestore';
```

- [ ] **Step 3: Rewrite `src/infrastructure/repositories/index.ts`**

```ts
export { FirestoreDevotionalRepository } from './FirestoreDevotionalRepository';
export { FirestoreClaimRepository } from './FirestoreClaimRepository';
```

### Task 8: Strip mapFirebaseAuthError and AUTH_MESSAGES

**Files:**

- Modify: `src/infrastructure/firebase/errors.ts`
- Modify: `src/infrastructure/firebase/errors.test.ts`

`mapFirebaseAuthError` was only called by `FirebaseAuthService` (deleted in Task 7), so it has no callers.

- [ ] **Step 1: Replace `src/infrastructure/firebase/errors.ts`**

```ts
import { FirebaseError } from 'firebase/app';
import {
  type DomainError,
  UnauthorizedError,
  UnexpectedError,
  ValidationError,
} from '@domain/errors';

export const mapFirestoreError = (error: unknown): DomainError => {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return new UnauthorizedError('沒有權限執行此操作。', { cause: error });
    }
    if (error.code === 'invalid-argument') {
      return new ValidationError(error.message, { cause: error });
    }
    return new UnexpectedError(error.message, { cause: error });
  }
  if (error instanceof Error) {
    return new UnexpectedError(error.message, { cause: error });
  }
  return new UnexpectedError('未知錯誤。');
};
```

- [ ] **Step 2: Replace `src/infrastructure/firebase/errors.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { UnauthorizedError, UnexpectedError, ValidationError } from '@domain/errors';
import { mapFirestoreError } from './errors';

describe('mapFirestoreError', () => {
  it('maps permission-denied to UnauthorizedError', () => {
    const original = new FirebaseError('permission-denied', 'denied');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(UnauthorizedError);
    expect(mapped.cause).toBe(original);
  });

  it('maps invalid-argument to ValidationError', () => {
    const original = new FirebaseError('invalid-argument', 'bad input');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(ValidationError);
    expect(mapped.message).toBe('bad input');
  });

  it('maps other Firebase errors to UnexpectedError', () => {
    const original = new FirebaseError('unavailable', 'service down');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toBe('service down');
  });

  it('wraps a non-Firebase Error as UnexpectedError', () => {
    const original = new Error('disk full');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toBe('disk full');
    expect(mapped.cause).toBe(original);
  });

  it('handles non-Error values with the default message', () => {
    const mapped = mapFirestoreError(42);
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toBe('未知錯誤。');
  });
});
```

- [ ] **Step 3: Run typecheck — should now be green**

```bash
npm run typecheck
```

Expected: exit 0. The presentation + infrastructure layers are now consistent. The `application/use-cases/SignIn*.ts`, `SignOut.ts`, `SaveDevotional.ts`, `DeleteDevotional.ts`, the `AuthService` port, `AuthDTO`, and `authMapper` still exist and still compile — they form a self-consistent unused subgraph that Phase 3 deletes.

- [ ] **Step 4: Checkpoint commit (optional)**

```bash
git add -A && git commit -m "refactor(infrastructure): drop Firebase Auth wiring + Firebase Auth error mapper"
```

---

## Phase 3 — Application

### Task 9: Delete auth + admin use cases, port, DTO, mapper

**Files:**

- Delete: `src/application/use-cases/SignInWithEmail.ts`
- Delete: `src/application/use-cases/SignInWithGoogle.ts`
- Delete: `src/application/use-cases/SignOut.ts`
- Delete: `src/application/use-cases/SaveDevotional.ts`
- Delete: `src/application/use-cases/DeleteDevotional.ts`
- Delete: `src/application/ports/AuthService.ts`
- Delete: `src/application/dto/AuthDTO.ts`
- Delete: `src/application/mappers/authMapper.ts`
- Modify: `src/application/use-cases/index.ts`
- Modify: `src/application/ports/index.ts`
- Modify: `src/application/dto/index.ts`

Note: `SignInWithEmail.ts` exports both `SignInWithEmail` and `SignUpWithEmail`; deleting the file removes both.

- [ ] **Step 1: Delete files**

```bash
rm src/application/use-cases/SignInWithEmail.ts \
   src/application/use-cases/SignInWithGoogle.ts \
   src/application/use-cases/SignOut.ts \
   src/application/use-cases/SaveDevotional.ts \
   src/application/use-cases/DeleteDevotional.ts \
   src/application/ports/AuthService.ts \
   src/application/dto/AuthDTO.ts \
   src/application/mappers/authMapper.ts
```

- [ ] **Step 2: Rewrite `src/application/use-cases/index.ts`**

```ts
export type { UseCase } from './UseCase';
export { GetDevotional } from './GetDevotional';
export type { GetDevotionalInput } from './GetDevotional';
export { ListDevotionals } from './ListDevotionals';
export { SubmitClaim } from './SubmitClaim';
export { CheckForUpdate } from './CheckForUpdate';
```

- [ ] **Step 3: Rewrite `src/application/ports/index.ts`**

```ts
export type { BuiltInDevotionalSource } from './BuiltInDevotionalSource';
export type { VersionSource } from './VersionSource';
```

- [ ] **Step 4: Rewrite `src/application/dto/index.ts`**

```ts
export type {
  DevotionalDTO,
  DevotionalSummaryDTO,
  DevotionalInputDTO,
  DevotionalSource,
} from './DevotionalDTO';
export type { ClaimRequestDTO, ClaimRequestInputDTO } from './ClaimDTO';
```

- [ ] **Step 5: Run typecheck — should still be green**

```bash
npm run typecheck
```

Expected: exit 0. No caller of `DevotionalRepository.save` / `.delete` exists anywhere in the codebase now.

- [ ] **Step 6: Checkpoint commit (optional)**

```bash
git add -A && git commit -m "refactor(application): drop auth + admin use cases, port, dto, mapper"
```

---

## Phase 4 — Trim devotional repository to read-only

Both the interface and the concrete impl drop `save`/`delete`. This is safe now (and only now) because no caller remains.

### Task 10: Trim DevotionalRepository interface

**Files:**

- Modify: `src/domain/repositories/DevotionalRepository.ts`

- [ ] **Step 1: Replace the entire file contents**

```ts
import type { Result } from '@shared/result';
import type { DevotionalProps } from '@domain/entities';
import type { DayKey } from '@domain/value-objects';
import type { DomainError } from '@domain/errors';

export interface DevotionalSummary {
  readonly key: DayKey;
  readonly title: string;
  readonly verseRef: string;
  readonly updatedAt: Date;
}

export interface DevotionalRepository {
  findByKey(key: DayKey): Promise<Result<DevotionalProps | null, DomainError>>;
  list(): Promise<Result<DevotionalSummary[], DomainError>>;
}
```

### Task 11: Trim FirestoreDevotionalRepository to read-only

**Files:**

- Modify: `src/infrastructure/repositories/FirestoreDevotionalRepository.ts`

- [ ] **Step 1: Replace the entire file contents**

```ts
import {
  type Firestore,
  type Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import type { DevotionalProps } from '@domain/entities';
import type { DayKey } from '@domain/value-objects';
import type { DevotionalRepository, DevotionalSummary } from '@domain/repositories';
import { mapFirestoreError } from '@infrastructure/firebase/errors';

const COLLECTION = 'devotionals';

interface DevotionalDoc {
  readonly dateLabel: string;
  readonly dateEn: string;
  readonly title: string;
  readonly verseRef: string;
  readonly verseTrans: string;
  readonly verse: string;
  readonly body: string[];
  readonly reflection: string;
  readonly updatedAt: Timestamp;
}

const toEntity = (key: DayKey, raw: DevotionalDoc): DevotionalProps => ({
  key,
  dateLabel: raw.dateLabel,
  dateEn: raw.dateEn,
  title: raw.title,
  verseRef: raw.verseRef,
  verseTrans: raw.verseTrans ?? '',
  verse: raw.verse,
  body: raw.body,
  reflection: raw.reflection ?? '',
  updatedAt: raw.updatedAt.toDate(),
});

export class FirestoreDevotionalRepository implements DevotionalRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async findByKey(key: DayKey): Promise<Result<DevotionalProps | null, DomainError>> {
    try {
      const ref = doc(this.db, COLLECTION, key);
      const snap = await getDoc(ref);
      if (!snap.exists()) return ok(null);
      return ok(toEntity(key, snap.data() as DevotionalDoc));
    } catch (error) {
      return err(mapFirestoreError(error));
    }
  }

  async list(): Promise<Result<DevotionalSummary[], DomainError>> {
    try {
      const ref = collection(this.db, COLLECTION);
      const snap = await getDocs(query(ref, orderBy('__name__')));
      const items: DevotionalSummary[] = snap.docs.map((d) => {
        const data = d.data() as DevotionalDoc;
        return {
          key: d.id as DayKey,
          title: data.title,
          verseRef: data.verseRef,
          updatedAt: data.updatedAt.toDate(),
        };
      });
      return ok(items);
    } catch (error) {
      return err(mapFirestoreError(error));
    }
  }
}
```

`Timestamp` is now a type-only import (only referenced in the `DevotionalDoc` interface, no runtime use). `setDoc`, `deleteDoc`, the `toDoc` helper, and the `save` / `delete` methods are gone.

- [ ] **Step 2: Run typecheck — should be green**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Checkpoint commit (optional)**

```bash
git add -A && git commit -m "refactor(devotional repo): drop write methods (interface + impl)"
```

---

## Phase 5 — Domain auth deletion

### Task 12: Delete User entity, UserRepository, AuthenticationError

**Files:**

- Delete: `src/domain/entities/User.ts`
- Delete: `src/domain/repositories/UserRepository.ts`
- Modify: `src/domain/entities/index.ts`
- Modify: `src/domain/repositories/index.ts`
- Modify: `src/domain/errors/DomainError.ts`

- [ ] **Step 1: Delete files**

```bash
rm src/domain/entities/User.ts src/domain/repositories/UserRepository.ts
```

- [ ] **Step 2: Rewrite `src/domain/entities/index.ts`**

```ts
export { Devotional } from './Devotional';
export type { DevotionalProps } from './Devotional';
export { ClaimRequest } from './ClaimRequest';
export type { ClaimRequestProps } from './ClaimRequest';
```

- [ ] **Step 3: Rewrite `src/domain/repositories/index.ts`**

```ts
export type { DevotionalRepository, DevotionalSummary } from './DevotionalRepository';
export type { ClaimRepository } from './ClaimRepository';
```

- [ ] **Step 4: Replace `src/domain/errors/DomainError.ts`**

```ts
// Base class for all domain-layer errors.
// Concrete domain errors extend this class so the application layer can branch on `kind`
// without leaking infrastructure details (HTTP status codes, Firebase error codes, etc.).
export abstract class DomainError extends Error {
  abstract readonly kind: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly kind = 'NotFound' as const;
}

export class ValidationError extends DomainError {
  readonly kind = 'Validation' as const;
}

export class UnauthorizedError extends DomainError {
  readonly kind = 'Unauthorized' as const;
}

export class UnexpectedError extends DomainError {
  readonly kind = 'Unexpected' as const;
}
```

- [ ] **Step 5: Run the full TS / lint / test gate**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three exit 0. If lint flags an unused import in a file the earlier phases rewrote, fix it inline and rerun — but every file that referenced auth was rewritten in full.

- [ ] **Step 6: Checkpoint commit (optional)**

```bash
git add -A && git commit -m "refactor(domain): drop User entity, UserRepository, AuthenticationError"
```

---

## Phase 6 — Config & docs

### Task 13: Update firestore.rules

**Files:**

- Modify: `firestore.rules`

- [ ] **Step 1: Replace the entire file contents**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Devotional content — public read. Writes are denied for all clients;
    // content is edited directly in the Firebase console.
    match /devotionals/{key} {
      allow read: if true;
    }

    // Soft-copy / contact claims submitted from the public card screen.
    // Anyone can submit a claim (shape validated server-side); reads and
    // edits are denied for all clients. Inspect submissions via the
    // Firebase console.
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

    // Default deny anything else.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Task 14: Update README.md

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Replace the Firebase section (lines 43–51 in the current file)**

Old block:

```
## Firebase

1. Copy `.env.example` to `.env.local` and fill in the Firebase web app config.
2. Enable **Email/Password** and **Google** sign-in providers in the Firebase console (Authentication → Sign-in method).
3. Install the Firebase CLI: `npm i -g firebase-tools`, then `firebase login`.
4. Deploy:
```

npm run deploy

```

```

New block:

```
## Firebase

1. Copy `.env.example` to `.env.local` and fill in the Firebase web app config.
2. Install the Firebase CLI: `npm i -g firebase-tools`, then `firebase login`.
3. Deploy:
```

npm run deploy

```

Devotional content is edited directly in the Firebase console
(**Firestore → devotionals → {MM-DD}**). Claim submissions land in
**Firestore → claims**; only the console (or a service account) can read them.
```

- [ ] **Step 2: Delete the "Granting the first admin" subsection (lines 53–60 in the current file, between the Firebase section and the Routes section)**

Block to remove:

```
### Granting the first admin

`firestore.rules` lets readers create their own `users/{uid}` document with role `reader`,
but only an existing admin can change a role. To bootstrap the first admin:

1. Sign up through the app (e.g. via `/sign-in`).
2. In the Firebase console, open **Firestore → users → {your uid}** and set `role` to `"admin"`.
3. Reload the app — the **管理 / Admin** link will appear in the header and `/admin` will become accessible.
```

- [ ] **Step 3: Replace the Routes table (lines 62–70 in the current file)**

Old block:

```
## Routes

| Path                      | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `/`                       | Landing — pick a month and day                    |
| `/read/:month/:day`       | Reading view for the selected day                  |
| `/sign-in`                | Email + Google sign-in / sign-up                   |
| `/admin`                  | Admin (gated) — month selector + day grid          |
| `/admin/:month/:day`      | Admin editor for one day's devotional              |
```

New block:

```
## Routes

| Path                  | Description                                     |
| --------------------- | ----------------------------------------------- |
| `/`                   | Landing — pick a month and day                  |
| `/card/:month/:day`   | Card view + claim-by-email dialog               |
| `/read/:month/:day`   | Reading view for the selected day               |
```

### Task 15: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the "Firebase + Firestore rules" section (lines 164–175 in the current file)**

Old block:

```
## Firebase + Firestore rules

Schema:
- `devotionals/{MM-DD}` — public read, admin write.
- `users/{uid}` — readers can read/create their own profile (with role `'reader'`); only
  admins can change roles.

`firestore.rules` is the source of truth. Update it whenever you add a collection or change
the access model.

The first admin must be promoted manually in the Firebase console (set `users/{uid}.role`
to `"admin"`); see README.
```

New block:

```
## Firebase + Firestore rules

Schema:
- `devotionals/{MM-DD}` — public read; writes denied for all clients (edit via Firebase console).
- `claims/{claimId}` — anonymous create with shape validation; reads/updates/deletes denied
  for all clients (inspect submissions via Firebase console).

`firestore.rules` is the source of truth. Update it whenever you add a collection or change
the access model.
```

### Task 16: Checkpoint commit (optional)

- [ ] **Step 1: Commit config + docs**

```bash
git add -A && git commit -m "docs: drop auth-related instructions; reflect read-only rules"
```

---

## Phase 7 — Verify

### Task 17: Full verification gate

- [ ] **Step 1: Run the four-command gate from CLAUDE.md**

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Expected: each command exits 0. The Vitest run shows fewer tests than the baseline (the four `mapFirebaseAuthError` cases removed in Task 8) but no failures.

- [ ] **Step 2: Manual smoke test in a browser**

```bash
npm run dev
```

Click through, in both light and dark mode (toggle via the header):

1. `/` (Landing) — month/day picker renders; header shows only the theme toggle (no sign-in pill, no admin pill).
2. Pick a day → navigates to `/card/MM/DD`. Card renders. Click "領取電子卡" → ClaimDialog opens.
3. ClaimDialog: ESC closes; clicking the backdrop closes; submitting a valid name + email shows the success state. Verify the write landed by checking **Firestore → claims** in the Firebase console.
4. From the card screen, navigate to `/read/MM/DD` (use the existing card → reading link, or type the URL). Long-form content renders; multi-column collapses below 720px.
5. Visit `/sign-in` and `/admin` directly — both should render the `NotFoundPage`.
6. Open DevTools → Network and reload `/`. There should be no requests to `identitytoolkit.googleapis.com` (the Firebase Auth endpoint).

- [ ] **Step 3: Final commit (optional)**

```bash
git add -A && git commit -m "chore: complete auth removal"
```

---

## Spec coverage check

| Spec section                                                         | Tasks                            |
| -------------------------------------------------------------------- | -------------------------------- |
| Removed: Presentation files                                          | 1                                |
| Removed: Presentation barrels                                        | 2                                |
| Removed: /sign-in and /admin routes                                  | 3                                |
| Removed: Sign-in/sign-out nav from PageHeader                        | 4                                |
| Removed: AuthProvider wrapper                                        | 5                                |
| Updated: Container (drop authService + 6 use cases)                  | 6                                |
| Removed: infrastructure/auth/ + firebase/auth.ts                     | 7                                |
| Removed: FirestoreUserRepository                                     | 7                                |
| Removed: Repo barrel + firebase index re-export                      | 7                                |
| Trimmed: mapFirebaseAuthError + AUTH_MESSAGES + matching tests       | 8                                |
| Removed: Application use cases (sign-in/out, save/delete devotional) | 9                                |
| Removed: AuthService port, AuthDTO, authMapper                       | 9                                |
| Removed: Application barrels                                         | 9                                |
| Trimmed: DevotionalRepository interface                              | 10                               |
| Trimmed: FirestoreDevotionalRepository to read-only                  | 11                               |
| Removed: User.ts, UserRepository.ts, AuthenticationError, barrels    | 12                               |
| Updated: firestore.rules                                             | 13                               |
| Updated: README.md                                                   | 14                               |
| Updated: CLAUDE.md                                                   | 15                               |
| Verification gate                                                    | 17                               |
| Kept: `UnauthorizedError`, `authDomain` env var, `firebase` dep      | (no task — explicitly untouched) |
| Kept: ClaimDialog, SubmitClaim, FirestoreClaimRepository             | (no task — explicitly untouched) |
