# Drop Firestore Devotionals + Simplify Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Firestore from the devotional read path (builtin becomes the only source); simplify the Card screen by removing the "翻頁中…" loading indicator and the hashtag-copy floating button + toast.

**Architecture:** Outside-in deletion. Order: presentation → application → infrastructure → domain → config → verify. Every step leaves the build green — no atomic phase. The Firestore SDK and `firebaseApp` / `firestore` module stay in the codebase because the claim flow still depends on them.

**Tech Stack:** React 19, TypeScript (strict + `erasableSyntaxOnly` + `verbatimModuleSyntax`), Vite 8, React Router 7, Firebase Firestore (claims only after this), Vitest. Not a git repo; commit steps are optional.

**Spec:** `docs/superpowers/specs/2026-05-12-drop-firestore-devotionals-design.md`

---

## Preflight

Confirm the baseline is green:

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all exit 0. Tests: 92 passing.

---

## Phase 1 — Presentation (Card screen)

### Task 1: Rewrite CardPage

**Files:**

- Modify: `src/presentation/pages/CardPage.tsx`

- [ ] **Step 1: Replace the entire file with EXACTLY**

```tsx
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { formatChineseDate } from '@shared/date';
import { ClaimDialog, PageFooter, PageHeader } from '@presentation/components';
import { useDayParams, useDevotional } from '@presentation/hooks';
import cardBackground from '@presentation/assets/card-background.png';

export const CardPage = () => {
  const params = useDayParams();
  if (!params) return <InvalidDate />;
  return <CardContent month={params.month} day={params.day} />;
};

const InvalidDate = () => (
  <main className="page">
    <PageHeader />
    <section className="section-message">
      <p className="kicker">Not Found</p>
      <h1 className="section-title">這不是一個有效的日期</h1>
      <Link to="/" className="btn-solid">
        回到首頁 →
      </Link>
    </section>
    <PageFooter />
  </main>
);

const CardContent = ({ month, day }: { month: number; day: number }) => {
  const { entry, loading, error } = useDevotional(month, day);
  const dateLabel = formatChineseDate(month, day);
  const [claimOpen, setClaimOpen] = useState(false);

  return (
    <main className="card-screen" aria-label={`${dateLabel}靈修卡片`}>
      <img className="card-screen-bg" src={cardBackground} alt="" aria-hidden />

      <Link to="/" className="card-back" aria-label="返回選擇日期">
        <span className="card-back-icon" aria-hidden>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </span>
        <span className="card-back-label">另選日期</span>
      </Link>

      <section className="card-screen-content">
        <p className="card-date brush-zh">{dateLabel}</p>

        {entry && !loading && (
          <>
            <h1 className="card-title brush-zh">{entry.title}</h1>
            <p className="card-verse">「{entry.verse}」</p>
            <p className="card-ref">
              {entry.verseRef}
              {entry.verseTrans ? `（${entry.verseTrans}）` : ''}
            </p>
          </>
        )}
      </section>

      {entry && !loading && (
        <footer className="card-screen-actions">
          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="card-action-btn"
            aria-label="領取電子卡"
          >
            <Mail size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </footer>
      )}

      {error && !loading && (
        <div className="banner banner-error card-error-banner" role="alert">
          載入失敗：{error}
        </div>
      )}

      <ClaimDialog
        open={claimOpen}
        month={month}
        day={day}
        dateLabel={dateLabel}
        onClose={() => setClaimOpen(false)}
      />
    </main>
  );
};
```

Gone: the `Hash` and `Check` lucide imports, `useRef`/`useEffect` (already absent), the `SHARE_HASHTAG` constant, the `copied`/`setCopied` state, the `copyHashtag` function, the hashtag `<button>`, the `{copied && <div className="card-toast">…</div>}` block, and the `{loading && <div className="card-status">翻頁中…</div>}` line.

### Task 2: Remove dead CSS from global.css

**Files:**

- Modify: `src/presentation/styles/global.css`

- [ ] **Step 1: Delete the `.card-toast` rule and its `@keyframes cardToastRise` companion (currently around lines 1003-1034)**

Find the block matching:

```css
.card-toast {
  position: fixed;
  left: 50%;
  bottom: var(--space-5);
  transform: translateX(-50%);
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 20px;
  background: rgba(20, 14, 8, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #f5f1ea;
  border-radius: var(--radius-pill);
  font-size: 13px;
  letter-spacing: 0.06em;
  box-shadow: 0 14px 36px -16px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: cardToastRise 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes cardToastRise {
  from {
    opacity: 0;
    transform: translate(-50%, 16px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
```

Delete it entirely, including the trailing blank line. Leave the surrounding rules (`.card-screen-actions` above, the `/* Action buttons... */` comment + `.card-action-btn` below) untouched.

- [ ] **Step 2: Delete the `.card-status` rule (currently around lines 1095-1105)**

Find the block matching:

```css
.card-status {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  font-size: 12px;
  letter-spacing: 0.32em;
  color: var(--ink-mute);
  background: rgba(245, 241, 234, 0.55);
}
```

Delete it entirely, including the trailing blank line. Leave the surrounding rules (the `@media (max-width: 720px)` block above for `.card-back`, the `.card-error-banner` block below) untouched.

- [ ] **Step 3: Verify zero remaining references**

```bash
grep -nE "\\.card-toast|\\.card-status|cardToastRise" src/presentation/styles/global.css src/presentation
```

Expected: zero matches.

### Task 3: Verify Phase 1

- [ ] **Step 1: Run gate**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all exit 0. Test count: 92 passing.

---

## Phase 2 — Application

### Task 4: Simplify GetDevotional

**Files:**

- Modify: `src/application/use-cases/GetDevotional.ts`

- [ ] **Step 1: Replace the entire file with EXACTLY**

```ts
import type { Result } from '@shared/result';
import { err, isErr, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import { DayKey } from '@domain/value-objects';
import type { BuiltInDevotionalSource } from '@application/ports';
import type { DevotionalDTO } from '@application/dto';
import { buildPlaceholderDTO, toDevotionalDTO } from '@application/mappers/devotionalMapper';
import type { UseCase } from './UseCase';

export interface GetDevotionalInput {
  readonly month: number;
  readonly day: number;
}

export class GetDevotional implements UseCase<GetDevotionalInput, DevotionalDTO> {
  private readonly builtIn: BuiltInDevotionalSource;

  constructor(builtIn: BuiltInDevotionalSource) {
    this.builtIn = builtIn;
  }

  async execute(input: GetDevotionalInput): Promise<Result<DevotionalDTO, DomainError>> {
    const keyResult = DayKey.create(input.month, input.day);
    if (isErr(keyResult)) return err(keyResult.error);

    const builtIn = this.builtIn.findByKey(keyResult.value);
    if (builtIn !== null) {
      return ok(toDevotionalDTO(builtIn));
    }

    return ok(buildPlaceholderDTO(input.month, input.day));
  }
}
```

Gone: the `DevotionalRepository` import + field + constructor parameter, and the `await this.repo.findByKey(...)` branch. The method stays `async` to satisfy the `UseCase<I, O>` contract.

After this step the build is intentionally red — `container.ts` still calls `new GetDevotional(devotionalRepo, builtInDevotionals)` with two arguments. Phase 3 fixes that.

---

## Phase 3 — Infrastructure

### Task 5: Update DI container

**Files:**

- Modify: `src/infrastructure/di/container.ts`

- [ ] **Step 1: Replace the entire file with EXACTLY**

```ts
import { CheckForUpdate, GetDevotional, SubmitClaim } from '@application/use-cases';
import { firestore } from '@infrastructure/firebase';
import { FirestoreClaimRepository } from '@infrastructure/repositories';
import { InMemoryBuiltInDevotionalSource } from '@infrastructure/data/builtInDevotionals';
import { HttpVersionSource } from '@infrastructure/version/HttpVersionSource';

export interface UseCases {
  readonly getDevotional: GetDevotional;
  readonly submitClaim: SubmitClaim;
  readonly checkForUpdate: CheckForUpdate;
}

export interface Container {
  readonly useCases: UseCases;
}

export const buildContainer = (): Container => {
  const claimRepo = new FirestoreClaimRepository(firestore);
  const builtInDevotionals = new InMemoryBuiltInDevotionalSource();
  const versionSource = new HttpVersionSource();

  const useCases: UseCases = {
    getDevotional: new GetDevotional(builtInDevotionals),
    submitClaim: new SubmitClaim(claimRepo),
    checkForUpdate: new CheckForUpdate(versionSource, __APP_VERSION__),
  };

  return { useCases };
};
```

Gone: `FirestoreDevotionalRepository` import + instantiation, the `firestore: Firestore` field on the `Container` interface, the `import type { Firestore } from 'firebase/firestore'`, and the `firestore` key in the return statement. The local `firestore` module is still imported and used to construct `FirestoreClaimRepository`.

### Task 6: Delete FirestoreDevotionalRepository

**Files:**

- Delete: `src/infrastructure/repositories/FirestoreDevotionalRepository.ts`
- Modify: `src/infrastructure/repositories/index.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/infrastructure/repositories/FirestoreDevotionalRepository.ts
```

- [ ] **Step 2: Rewrite `src/infrastructure/repositories/index.ts` with EXACTLY**

```ts
export { FirestoreClaimRepository } from './FirestoreClaimRepository';
```

### Task 7: Verify Phase 3

- [ ] **Step 1: Run typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0. (The `DevotionalRepository` interface in `@domain/repositories` still exists; the dead-but-self-consistent state is fine — Phase 4 deletes it.)

---

## Phase 4 — Domain

### Task 8: Delete DevotionalRepository interface

**Files:**

- Delete: `src/domain/repositories/DevotionalRepository.ts`
- Modify: `src/domain/repositories/index.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/domain/repositories/DevotionalRepository.ts
```

- [ ] **Step 2: Rewrite `src/domain/repositories/index.ts` with EXACTLY**

```ts
export type { ClaimRepository } from './ClaimRepository';
```

### Task 9: Verify Phase 4

- [ ] **Step 1: Run gate**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all exit 0. Tests still 92.

---

## Phase 5 — Config & docs

### Task 10: Update firestore.rules

**Files:**

- Modify: `firestore.rules`

- [ ] **Step 1: Replace the entire file with EXACTLY**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

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

Gone: the `match /devotionals/{key}` block and its surrounding comment.

### Task 11: Update README.md

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Edit the Firebase section**

Find the block (current state):

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

Replace with:

```
## Firebase

1. Copy `.env.example` to `.env.local` and fill in the Firebase web app config.
2. Install the Firebase CLI: `npm i -g firebase-tools`, then `firebase login`.
3. Deploy:
```

npm run deploy

```

Claim submissions land in **Firestore → claims**; only the console (or a service account) can read them. Devotional content is authored in TypeScript under `src/infrastructure/data/builtInDevotionals/` and ships with each build.
```

### Task 12: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Edit the Firebase + Firestore rules schema list**

Find the block (current state):

```
## Firebase + Firestore rules

Schema:
- `devotionals/{MM-DD}` — public read; writes denied for all clients (edit via Firebase console).
- `claims/{claimId}` — anonymous create with shape validation; reads/updates/deletes denied
  for all clients (inspect submissions via Firebase console).

`firestore.rules` is the source of truth. Update it whenever you add a collection or change
the access model.
```

Replace with:

```
## Firebase + Firestore rules

Schema:
- `claims/{claimId}` — anonymous create with shape validation; reads/updates/deletes denied
  for all clients (inspect submissions via Firebase console).

Devotional content is authored as TypeScript seeds in
`src/infrastructure/data/builtInDevotionals/` (not in Firestore). The `BuiltInDevotionalSource`
port + `InMemoryBuiltInDevotionalSource` impl expose them to the app.

`firestore.rules` is the source of truth. Update it whenever you add a collection or change
the access model.
```

---

## Phase 6 — Verify

### Task 13: Full verification gate

- [ ] **Step 1: Run the four-command gate**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: all exit 0. Tests still 92.

- [ ] **Step 2: Confirm no leftover references in source**

```bash
grep -rn "FirestoreDevotionalRepository\|DevotionalRepository\|SHARE_HASHTAG\|copyHashtag\|cardToastRise\|card-toast\|card-status" src --include="*.ts" --include="*.tsx" --include="*.css"
```

Expected: zero matches.

- [ ] **Step 3: Manual browser smoke test**

```bash
npm run dev
```

In a browser:

1. `/` (Landing) renders, picker works.
2. Pick a day → `/card/MM/DD`. The card content (title, verse, ref) appears **immediately** — no `翻頁中…` flash. Background image + date label flash for at most one frame before the rest arrives.
3. Floating footer in the bottom-right shows exactly **one** button (Mail/claim). No hashtag button. Clicking it opens the ClaimDialog as before.
4. Test the claim flow end-to-end: enter name + email, submit, see success. (Confirms the Firestore SDK still works for claims even after pulling devotional reads off Firestore.)
5. DevTools → Network on `/card/5/12`: there should be **no** request to `firestore.googleapis.com` related to a `devotionals/...` document. Requests for `claims/...` only appear when submitting the dialog form.

---

## Spec coverage check

| Spec section                                                 | Tasks     |
| ------------------------------------------------------------ | --------- |
| Simplify CardPage: remove loading indicator                  | 1         |
| Simplify CardPage: remove hashtag button + toast + state     | 1         |
| Delete `.card-toast` + `@keyframes cardToastRise` CSS        | 2         |
| Delete `.card-status` CSS                                    | 2         |
| Simplify `GetDevotional`                                     | 4         |
| Drop `Container.firestore` field + import                    | 5         |
| Pass only `builtInDevotionals` to `GetDevotional`            | 5         |
| Delete `FirestoreDevotionalRepository` + barrel              | 6         |
| Delete `DevotionalRepository` interface + barrel             | 8         |
| Drop `devotionals/{key}` rule                                | 10        |
| Update README "edit via console" paragraph                   | 11        |
| Update CLAUDE.md schema list                                 | 12        |
| Full verification (typecheck/lint/build/test + smoke)        | 13        |
| Kept: builtin source, Devotional entity, claim flow          | (no task) |
| Kept: `firebaseApp`, `firestore` module, `mapFirestoreError` | (no task) |
