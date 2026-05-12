# Remove Reading View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the `/read/:month/:day` reading view, all auth-era list-side dead code, and every `body[]` / `reflection` / `dateEn` / `updatedAt` / `source` field tied only to that view. Strip ~5,400 lines of authored Chinese devotional content from the working tree (copyright-driven; no git history preserves it).

**Architecture:** Outside-in deletion. Order: presentation → application+container → **domain+infrastructure (atomic)** → shared → docs → verify. The domain/infra phase is atomic because the trimmed `Devotional` entity type and its producers (`FirestoreDevotionalRepository.toEntity`, `InMemoryBuiltInDevotionalSource.buildIndex`, `BuiltInDevotionalSeed` type, 12 month files) are mutually constrained — neither side can be in the trimmed shape while the other isn't.

**Tech Stack:** React 19, TypeScript (strict + `erasableSyntaxOnly` + `verbatimModuleSyntax`), Vite 8, React Router 7, Firebase (Firestore only), Vitest. Working dir is **not** a git repo; commit steps are optional checkpoint markers.

**Spec:** `docs/superpowers/specs/2026-05-12-remove-reading-view-design.md`

---

## Preflight

Confirm the baseline is green before changing anything:

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three exit 0. Tests: 103 passing.

---

## Phase 1 — Presentation

### Task 1: Delete reading-view files

**Files:**

- Delete: `src/presentation/pages/ReadingPage.tsx`
- Delete: `src/presentation/hooks/useDevotionalList.ts`

- [ ] **Step 1: Delete files**

```bash
rm src/presentation/pages/ReadingPage.tsx \
   src/presentation/hooks/useDevotionalList.ts
```

No verify here — build is intentionally red until Task 2 updates the barrels.

### Task 2: Update presentation barrels

**Files:**

- Modify: `src/presentation/pages/index.ts`
- Modify: `src/presentation/hooks/index.ts`

- [ ] **Step 1: Rewrite `src/presentation/pages/index.ts` with EXACTLY**

```ts
export { LandingPage } from './LandingPage';
export { CardPage } from './CardPage';
export { NotFoundPage } from './NotFoundPage';
```

- [ ] **Step 2: Rewrite `src/presentation/hooks/index.ts` with EXACTLY**

```ts
export { useContainer } from './useContainer';
export { useTheme } from './useTheme';
export { useDayParams } from './useDayParams';
export type { DayParams } from './useDayParams';
export { useDevotional } from './useDevotional';
export { useUpdateAvailable } from './useUpdateAvailable';
```

### Task 3: Strip the /read route from AppRouter

**Files:**

- Modify: `src/presentation/routes/AppRouter.tsx`

- [ ] **Step 1: Rewrite with EXACTLY**

```tsx
import { Route, Routes } from 'react-router-dom';
import { CardPage, LandingPage, NotFoundPage } from '@presentation/pages';

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/card/:month/:day" element={<CardPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
```

### Task 4: Remove BookOpen button from CardPage

**Files:**

- Modify: `src/presentation/pages/CardPage.tsx`

- [ ] **Step 1: Trim the lucide import (line 3) — `BookOpen` is no longer used**

Replace:

```tsx
import { ArrowLeft, BookOpen, Check, Hash, Mail } from 'lucide-react';
```

With:

```tsx
import { ArrowLeft, Check, Hash, Mail } from 'lucide-react';
```

- [ ] **Step 2: Remove the `<Link>` to `/read/...` (lines 90-96 in the current file)**

Replace:

```tsx
          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="card-action-btn"
            aria-label="領取電子卡"
          >
            <Mail size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <Link
            to={`/read/${String(month)}/${String(day)}`}
            className="card-action-btn"
            aria-label="翻開內文"
          >
            <BookOpen size={18} strokeWidth={1.75} aria-hidden />
          </Link>
        </footer>
```

With:

```tsx
          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="card-action-btn"
            aria-label="領取電子卡"
          >
            <Mail size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </footer>
```

The floating footer becomes two buttons: hashtag + claim.

### Task 5: Strip reading-only CSS from global.css

**Files:**

- Modify: `src/presentation/styles/global.css`

This task deletes ~25 selectors. The exact deletions are listed by block; the rest of the file stays.

- [ ] **Step 1: Delete the `.section-reading` block**

Find and delete the block matching:

```css
.section-reading {
  ... (the existing rule body)
}
```

- [ ] **Step 2: Delete the entire "Reading page" CSS section**

Locate the section header comment `/* ─── Reading page ─── */` (or equivalent — search for the first appearance of `.reading-sticky-bar` and back up to its section header comment). Delete from that comment through the last selector in that section. The block contains:

- `.reading-sticky-bar`
- `.reading-condensed-bar`, `.reading-condensed-date`, `.reading-condensed-divider`, `.reading-condensed-title`
- `.reading-datetag-row`
- `.reading-title`
- `.reading-divider`
- `.reading-body`
- `.reading-source-mark`, `.reading-source-mark--quiet`
- `.reading-end-actions`
- `.reading-action-btn`, `.reading-action-btn--copied`, `.reading-action-btn-label`

- [ ] **Step 3: Delete the verse-block cluster**

Find and delete each rule:

- `.verse-block`
- `.verse-tick`
- `.verse-text`
- `.verse-ref`
- `.verse-trans`

(CardPage uses its own `.card-verse` / `.card-ref` and is untouched.)

- [ ] **Step 4: Delete the reflect-card cluster**

- `.reflect-card`
- `.reflect-label`
- `.reflect-text`

- [ ] **Step 5: Delete the scroll-top FAB**

- `.scroll-top-fab`

If the FAB has a `@media` companion rule (e.g., positioning at narrow widths), delete that too.

- [ ] **Step 6: Verify with grep**

```bash
grep -nE "\.reading-|\.verse-block|\.verse-tick|\.verse-text|\.verse-ref|\.verse-trans|\.reflect-card|\.reflect-label|\.reflect-text|\.scroll-top-fab|\.section-reading" src/presentation/styles/global.css
```

Expected: zero matches.

### Task 6: Verify Phase 1 (typecheck + lint)

- [ ] **Step 1: Run gate**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0. The application still contains `ListDevotionals` and the container still wires it; those become orphans that Phase 2 cleans up. Tests still 103.

---

## Phase 2 — Application + container

### Task 7: Delete ListDevotionals + update use-cases barrel

**Files:**

- Delete: `src/application/use-cases/ListDevotionals.ts`
- Modify: `src/application/use-cases/index.ts`

- [ ] **Step 1: Delete file**

```bash
rm src/application/use-cases/ListDevotionals.ts
```

- [ ] **Step 2: Rewrite `src/application/use-cases/index.ts` with EXACTLY**

```ts
export type { UseCase } from './UseCase';
export { GetDevotional } from './GetDevotional';
export type { GetDevotionalInput } from './GetDevotional';
export { SubmitClaim } from './SubmitClaim';
export { CheckForUpdate } from './CheckForUpdate';
```

### Task 8: Update DI container

**Files:**

- Modify: `src/infrastructure/di/container.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import type { Firestore } from 'firebase/firestore';
import { CheckForUpdate, GetDevotional, SubmitClaim } from '@application/use-cases';
import { firestore } from '@infrastructure/firebase';
import {
  FirestoreClaimRepository,
  FirestoreDevotionalRepository,
} from '@infrastructure/repositories';
import { InMemoryBuiltInDevotionalSource } from '@infrastructure/data/builtInDevotionals';
import { HttpVersionSource } from '@infrastructure/version/HttpVersionSource';

export interface UseCases {
  readonly getDevotional: GetDevotional;
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
    submitClaim: new SubmitClaim(claimRepo),
    checkForUpdate: new CheckForUpdate(versionSource, __APP_VERSION__),
  };

  return { firestore, useCases };
};
```

`listDevotionals` is gone from both the interface and the implementation.

### Task 9: Trim DevotionalDTO

**Files:**

- Modify: `src/application/dto/DevotionalDTO.ts`
- Modify: `src/application/dto/index.ts`

- [ ] **Step 1: Rewrite `src/application/dto/DevotionalDTO.ts` with EXACTLY**

```ts
export interface DevotionalDTO {
  readonly key: string;
  readonly month: number;
  readonly day: number;
  readonly dateLabel: string;
  readonly title: string;
  readonly verseRef: string;
  readonly verseTrans: string;
  readonly verse: string;
}
```

`DevotionalSummaryDTO`, `DevotionalInputDTO`, `DevotionalSource` are all gone. The `dateEn`, `body`, `reflection`, `updatedAt`, `source` fields are gone from `DevotionalDTO`.

- [ ] **Step 2: Rewrite `src/application/dto/index.ts` with EXACTLY**

```ts
export type { DevotionalDTO } from './DevotionalDTO';
export type { ClaimRequestDTO, ClaimRequestInputDTO } from './ClaimDTO';
```

### Task 10: Trim devotionalMapper

**Files:**

- Modify: `src/application/mappers/devotionalMapper.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import type { DevotionalProps } from '@domain/entities';
import { DayKey } from '@domain/value-objects';
import { formatChineseDate, pad2 } from '@shared/date';
import type { DevotionalDTO } from '@application/dto';

export const toDevotionalDTO = (entry: DevotionalProps): DevotionalDTO => ({
  key: entry.key,
  month: DayKey.monthOf(entry.key),
  day: DayKey.dayOf(entry.key),
  dateLabel: entry.dateLabel,
  title: entry.title,
  verseRef: entry.verseRef,
  verseTrans: entry.verseTrans,
  verse: entry.verse,
});

// Stable placeholder shown for days with no Firestore or built-in entry.
// Coerces an out-of-range month to a valid one so the result type can stay
// narrow; the caller should usually have validated via DayKey first.
export const buildPlaceholderDTO = (month: number, day: number): DevotionalDTO => {
  const m = Math.max(1, Math.min(12, month));
  return {
    key: `${pad2(m)}-${pad2(day)}`,
    month: m,
    day,
    dateLabel: formatChineseDate(m, day),
    title: '為這一日感恩',
    verseRef: '詩篇 118:24',
    verseTrans: '新譯本',
    verse: '這是耶和華所定的日子，我們要在這一日歡喜快樂。',
  };
};
```

Dropped: `toSummaryDTO`, the `source` parameter to `toDevotionalDTO`, the dead-field mapping, and the `formatEnglishDate` import.

### Task 11: Simplify GetDevotional

**Files:**

- Modify: `src/application/use-cases/GetDevotional.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import type { Result } from '@shared/result';
import { err, isErr, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import { DayKey } from '@domain/value-objects';
import type { DevotionalRepository } from '@domain/repositories';
import type { BuiltInDevotionalSource } from '@application/ports';
import type { DevotionalDTO } from '@application/dto';
import { buildPlaceholderDTO, toDevotionalDTO } from '@application/mappers/devotionalMapper';
import type { UseCase } from './UseCase';

export interface GetDevotionalInput {
  readonly month: number;
  readonly day: number;
}

export class GetDevotional implements UseCase<GetDevotionalInput, DevotionalDTO> {
  private readonly repo: DevotionalRepository;
  private readonly builtIn: BuiltInDevotionalSource;

  constructor(repo: DevotionalRepository, builtIn: BuiltInDevotionalSource) {
    this.repo = repo;
    this.builtIn = builtIn;
  }

  async execute(input: GetDevotionalInput): Promise<Result<DevotionalDTO, DomainError>> {
    const keyResult = DayKey.create(input.month, input.day);
    if (isErr(keyResult)) return err(keyResult.error);

    const found = await this.repo.findByKey(keyResult.value);
    if (isErr(found)) return err(found.error);
    if (found.value !== null) {
      return ok(toDevotionalDTO(found.value));
    }

    const builtIn = this.builtIn.findByKey(keyResult.value);
    if (builtIn !== null) {
      return ok(toDevotionalDTO(builtIn));
    }

    return ok(buildPlaceholderDTO(input.month, input.day));
  }
}
```

The `'firestore'` / `'builtin'` source-marker arguments are removed.

### Task 12: Trim BuiltInDevotionalSource port

**Files:**

- Modify: `src/application/ports/BuiltInDevotionalSource.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import type { DevotionalProps } from '@domain/entities';
import type { DayKey } from '@domain/value-objects';

export interface BuiltInDevotionalSource {
  findByKey(key: DayKey): DevotionalProps | null;
}
```

`has()` and `list()` are gone. The `DevotionalSummary` import is gone.

### Task 13: Verify Phase 2 (typecheck + lint)

- [ ] **Step 1: Run gate**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0. Tests still 103. The domain entity still has the full shape; infrastructure still produces it; the mapper just stops reading the dropped fields.

---

## Phase 3 — Domain + infrastructure (atomic)

This phase changes the `Devotional` entity shape and every producer of that shape together. **Do not run typecheck between sub-tasks of Phase 3 — only at the end.** Internal states are intentionally inconsistent until the last sub-task lands.

### Task 14: Trim Devotional entity

**Files:**

- Modify: `src/domain/entities/Devotional.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import { ValidationError } from '@domain/errors';
import type { DayKey } from '@domain/value-objects';

export interface DevotionalProps {
  readonly key: DayKey;
  readonly dateLabel: string;
  readonly title: string;
  readonly verseRef: string;
  readonly verseTrans: string;
  readonly verse: string;
}

const trim = (s: string) => s.trim();

export const Devotional = {
  create(input: {
    key: DayKey;
    dateLabel: string;
    title: string;
    verseRef: string;
    verseTrans: string;
    verse: string;
  }): Result<DevotionalProps, ValidationError> {
    const required: Array<[string, string]> = [
      ['dateLabel', input.dateLabel],
      ['title', input.title],
      ['verseRef', input.verseRef],
      ['verse', input.verse],
    ];
    for (const [field, value] of required) {
      if (typeof value !== 'string' || trim(value).length === 0) {
        return err(new ValidationError(`Field "${field}" is required`));
      }
    }
    return ok({
      key: input.key,
      dateLabel: trim(input.dateLabel),
      title: trim(input.title),
      verseRef: trim(input.verseRef),
      verseTrans: trim(input.verseTrans),
      verse: trim(input.verse),
    });
  },
};

export type Devotional = DevotionalProps;
```

Dropped: `dateEn`, `body`, `reflection`, `updatedAt` fields; body validation; dateEn from required list; `updatedAt` parameter.

### Task 15: Rewrite Devotional.test.ts

**Files:**

- Modify: `src/domain/entities/Devotional.test.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '@shared/result';
import { DayKey } from '@domain/value-objects';
import { Devotional } from './Devotional';

const validKey = (() => {
  const result = DayKey.create(8, 7);
  if (!isOk(result)) throw new Error('precondition: DayKey.create failed');
  return result.value;
})();

const baseInput = {
  key: validKey,
  dateLabel: '八月七日',
  title: '祝福那反對你的人',
  verseRef: '使徒行傳 2:44–45',
  verseTrans: '新譯本',
  verse: '所有信的人都聚在一處，凡物公用。',
};

describe('Devotional.create', () => {
  it('returns a frozen-shape entity from a valid input', () => {
    const result = Devotional.create(baseInput);
    if (!isOk(result)) throw new Error('expected Ok');
    expect(result.value.key).toBe(validKey);
    expect(result.value.title).toBe(baseInput.title);
    expect(result.value.verseRef).toBe(baseInput.verseRef);
  });

  it.each(['dateLabel', 'title', 'verseRef', 'verse'] as const)('rejects empty %s', (field) => {
    const input = { ...baseInput, [field]: '   ' };
    expect(isErr(Devotional.create(input))).toBe(true);
  });

  it('trims surrounding whitespace from each field', () => {
    const result = Devotional.create({
      ...baseInput,
      title: '  祝福那反對你的人  ',
      verseRef: '  使徒行傳 2:44–45  ',
    });
    if (!isOk(result)) throw new Error('expected Ok');
    expect(result.value.title).toBe('祝福那反對你的人');
    expect(result.value.verseRef).toBe('使徒行傳 2:44–45');
  });
});
```

Dropped tests: body required, body whitespace, body filter/trim, reflection optional, `updatedAt` injection, `dateEn` required. Remaining tests cover the trimmed surface.

### Task 16: Trim DevotionalRepository interface + barrel

**Files:**

- Modify: `src/domain/repositories/DevotionalRepository.ts`
- Modify: `src/domain/repositories/index.ts`

- [ ] **Step 1: Rewrite `src/domain/repositories/DevotionalRepository.ts` with EXACTLY**

```ts
import type { Result } from '@shared/result';
import type { DevotionalProps } from '@domain/entities';
import type { DayKey } from '@domain/value-objects';
import type { DomainError } from '@domain/errors';

export interface DevotionalRepository {
  findByKey(key: DayKey): Promise<Result<DevotionalProps | null, DomainError>>;
}
```

`list()` and the `DevotionalSummary` type are gone.

- [ ] **Step 2: Rewrite `src/domain/repositories/index.ts` with EXACTLY**

```ts
export type { DevotionalRepository } from './DevotionalRepository';
export type { ClaimRepository } from './ClaimRepository';
```

### Task 17: Trim FirestoreDevotionalRepository

**Files:**

- Modify: `src/infrastructure/repositories/FirestoreDevotionalRepository.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import { type Firestore, doc, getDoc } from 'firebase/firestore';
import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import type { DevotionalProps } from '@domain/entities';
import type { DayKey } from '@domain/value-objects';
import type { DevotionalRepository } from '@domain/repositories';
import { mapFirestoreError } from '@infrastructure/firebase/errors';

const COLLECTION = 'devotionals';

interface DevotionalDoc {
  readonly dateLabel: string;
  readonly title: string;
  readonly verseRef: string;
  readonly verseTrans: string;
  readonly verse: string;
}

const toEntity = (key: DayKey, raw: DevotionalDoc): DevotionalProps => ({
  key,
  dateLabel: raw.dateLabel,
  title: raw.title,
  verseRef: raw.verseRef,
  verseTrans: raw.verseTrans ?? '',
  verse: raw.verse,
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
}
```

Dropped: `Timestamp`, `collection`, `getDocs`, `orderBy`, `query` imports; `DevotionalSummary` import; `list()` method; `dateEn`/`body`/`reflection`/`updatedAt` from `DevotionalDoc` and `toEntity`. Production Firestore docs may still carry these fields; the trimmed `DevotionalDoc` cast is a structural subset, so they're simply ignored at read time.

### Task 18: Trim BuiltInDevotionalSeed

**Files:**

- Modify: `src/infrastructure/data/builtInDevotionals/types.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
export interface BuiltInDevotionalSeed {
  readonly month: number;
  readonly day: number;
  readonly dateLabel: string;
  readonly title: string;
  readonly verseRef: string;
  readonly verseTrans: string;
  readonly verse: string;
}
```

Dropped: `dateEn`, `body`, `reflection`.

### Task 19: Trim InMemoryBuiltInDevotionalSource

**Files:**

- Modify: `src/infrastructure/data/builtInDevotionals/index.ts`

- [ ] **Step 1: Rewrite with EXACTLY**

```ts
import { Devotional, type DevotionalProps } from '@domain/entities';
import { DayKey } from '@domain/value-objects';
import type { BuiltInDevotionalSource } from '@application/ports';
import { isErr } from '@shared/result';
import { januarySeeds } from './01-january';
import { februarySeeds } from './02-february';
import { marchSeeds } from './03-march';
import { aprilSeeds } from './04-april';
import { maySeeds } from './05-may';
import { juneSeeds } from './06-june';
import { julySeeds } from './07-july';
import { augustSeeds } from './08-august';
import { septemberSeeds } from './09-september';
import { octoberSeeds } from './10-october';
import { novemberSeeds } from './11-november';
import { decemberSeeds } from './12-december';
import type { BuiltInDevotionalSeed } from './types';

const allSeeds: readonly BuiltInDevotionalSeed[] = [
  ...januarySeeds,
  ...februarySeeds,
  ...marchSeeds,
  ...aprilSeeds,
  ...maySeeds,
  ...juneSeeds,
  ...julySeeds,
  ...augustSeeds,
  ...septemberSeeds,
  ...octoberSeeds,
  ...novemberSeeds,
  ...decemberSeeds,
];

const buildIndex = (): ReadonlyMap<DayKey, DevotionalProps> => {
  const map = new Map<DayKey, DevotionalProps>();
  for (const seed of allSeeds) {
    const keyResult = DayKey.create(seed.month, seed.day);
    if (isErr(keyResult)) {
      // Skip malformed seeds rather than crash startup; they'll fall through to placeholder.
      continue;
    }
    const entityResult = Devotional.create({
      key: keyResult.value,
      dateLabel: seed.dateLabel,
      title: seed.title,
      verseRef: seed.verseRef,
      verseTrans: seed.verseTrans,
      verse: seed.verse,
    });
    if (isErr(entityResult)) continue;
    map.set(keyResult.value, entityResult.value);
  }
  return map;
};

export class InMemoryBuiltInDevotionalSource implements BuiltInDevotionalSource {
  private readonly index: ReadonlyMap<DayKey, DevotionalProps>;

  constructor() {
    this.index = buildIndex();
  }

  findByKey(key: DayKey): DevotionalProps | null {
    return this.index.get(key) ?? null;
  }
}
```

Dropped: `BUILTIN_UPDATED_AT` constant, `summaries` field, `has()` method, `list()` method, `DevotionalSummary` import, `dateEn`/`body`/`reflection`/`updatedAt` pass-through.

### Task 20: Scrub all 12 builtin month files

**Files:**

- Modify: `src/infrastructure/data/builtInDevotionals/01-january.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/02-february.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/03-march.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/04-april.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/05-may.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/06-june.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/07-july.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/08-august.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/09-september.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/10-october.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/11-november.ts`
- Modify: `src/infrastructure/data/builtInDevotionals/12-december.ts`

Each file contains an array of `BuiltInDevotionalSeed` entries with this exact shape (4-space indent inside the object):

```
  {
    month: N,
    day: N,
    dateLabel: '...',
    dateEn: '...',          // DELETE THIS LINE
    title: '...',
    verseRef: '...',
    verseTrans: '...',
    verse: '...',           // (or two lines: `verse:\n      '...',`)
    body: [                 // DELETE THIS BLOCK (through the closing `],`)
      '...',
      '...',
    ],
    reflection: '...',      // DELETE THIS LINE
  },
```

- [ ] **Step 1: Write the scrub script**

Create file: `scripts/scrub-builtin.mjs`

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = [
  '01-january',
  '02-february',
  '03-march',
  '04-april',
  '05-may',
  '06-june',
  '07-july',
  '08-august',
  '09-september',
  '10-october',
  '11-november',
  '12-december',
];

const baseDir = 'src/infrastructure/data/builtInDevotionals';

for (const name of files) {
  const path = resolve(`${baseDir}/${name}.ts`);
  let src = readFileSync(path, 'utf8');
  const before = src.length;

  // Delete `    dateEn: '...',\n`
  src = src.replace(/^    dateEn: '[^']*',\n/gm, '');

  // Delete `    body: [\n      '...',\n      ...\n    ],\n`
  src = src.replace(/^    body: \[\n(?:      '[^']*',?\n)+    \],\n/gm, '');

  // Delete `    reflection: '...',\n`
  src = src.replace(/^    reflection: '[^']*',\n/gm, '');

  writeFileSync(path, src);
  console.log(`${name}: ${before} -> ${src.length} bytes (-${before - src.length})`);
}
```

- [ ] **Step 2: Run the scrub**

```bash
node scripts/scrub-builtin.mjs
```

Expected output: 12 lines, each showing significant size reduction (roughly 70–75% smaller per file).

- [ ] **Step 3: Verify no orphaned fields remain**

```bash
grep -nE "^    (dateEn|body|reflection)\b" src/infrastructure/data/builtInDevotionals/*.ts
```

Expected: zero matches across all 12 files.

- [ ] **Step 4: Spot-check a file**

```bash
head -20 src/infrastructure/data/builtInDevotionals/01-january.ts
```

Expected: the first entry contains only `month`, `day`, `dateLabel`, `title`, `verseRef`, `verseTrans`, `verse` — no `dateEn`, `body`, or `reflection`.

- [ ] **Step 5: Delete the scrub script (one-shot tool)**

```bash
rm scripts/scrub-builtin.mjs
rmdir scripts 2>/dev/null || true
```

### Task 21: Verify Phase 3 atomically

- [ ] **Step 1: Run full gate**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three exit 0. Test count drops from 103 to roughly **99-101** (Devotional.test.ts went from 8 tests to 3 — losing 5 tests for body required, body whitespace, body filter/trim, reflection optional, dateEn required, plus the `updatedAt` injection test; the trimmed file keeps 3 tests).

If anything is red, do not proceed to Phase 4 — fix in this phase first.

---

## Phase 4 — Shared

### Task 22: Drop formatEnglishDate / formatEnglishMonth / EN_MONTHS

**Files:**

- Modify: `src/shared/date/format.ts`
- Modify: `src/shared/date/index.ts`

- [ ] **Step 1: Rewrite `src/shared/date/format.ts` with EXACTLY**

```ts
const CN_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

const CN_MONTHS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '十一',
  '十二',
] as const;

export const formatChineseMonth = (month: number): string => CN_MONTHS[month - 1] ?? String(month);

export const formatChineseDay = (day: number): string => {
  if (day < 1 || day > 31) return String(day);
  if (day < 10) return CN_DIGITS[day] ?? String(day);
  if (day === 10) return '十';
  if (day < 20) return `十${CN_DIGITS[day - 10] ?? ''}`;
  if (day === 20) return '二十';
  if (day < 30) return `二十${CN_DIGITS[day - 20] ?? ''}`;
  if (day === 30) return '三十';
  return `三十${CN_DIGITS[day - 30] ?? ''}`;
};

export const formatChineseDate = (month: number, day: number): string =>
  `${formatChineseMonth(month)}月${formatChineseDay(day)}日`;
```

Dropped: `EN_MONTHS` constant, `formatEnglishMonth`, `formatEnglishDate`.

- [ ] **Step 2: Rewrite `src/shared/date/index.ts` with EXACTLY**

```ts
export { MAX_DAYS_PER_MONTH, MONTHS, TOTAL_DAYS, daysInMonth, pad2 } from './calendar';
export { formatChineseDate, formatChineseDay, formatChineseMonth } from './format';
```

### Task 23: Verify Phase 4

- [ ] **Step 1: Run gate**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all green. Test count same as after Phase 3.

---

## Phase 5 — Docs

### Task 24: Update README.md

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update the Routes table**

Old block:

```
## Routes

| Path                  | Description                                     |
| --------------------- | ----------------------------------------------- |
| `/`                   | Landing — pick a month and day                  |
| `/card/:month/:day`   | Card view + claim-by-email dialog               |
| `/read/:month/:day`   | Reading view for the selected day               |
```

New block:

```
## Routes

| Path                  | Description                                     |
| --------------------- | ----------------------------------------------- |
| `/`                   | Landing — pick a month and day                  |
| `/card/:month/:day`   | Card view + claim-by-email dialog               |
```

### Task 25: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Drop section-reading from the Page sections list**

Find the line:

```
- **Page sections**: `section-landing`, `section-reading`, `section-message`.
```

Replace with:

```
- **Page sections**: `section-landing`, `section-message`.
```

If the prose anywhere else in CLAUDE.md references "long-form content" or "multi-column reading body" specifically tied to the reading view, leave it alone unless it's actively misleading after this change. (The "reading body uses CSS multi-column" comment in the Fonts/theming section becomes obsolete; rewrite it to: "Mobile-first breakpoints live in `global.css`.")

- [ ] **Step 2: Update the Fonts/theming responsive note**

Find the block that currently mentions multi-column / reading body:

```
Responsive: mobile-first breakpoints live in `global.css`. The reading body uses CSS
multi-column that collapses to single column under 720px — keep that pattern for any
long-form content.
```

Replace with:

```
Responsive: mobile-first breakpoints live in `global.css`.
```

---

## Phase 6 — Verify

### Task 26: Full verification gate

- [ ] **Step 1: Run the four-command gate**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: each exits 0. Test count should be roughly **99-101** (Devotional.test.ts shrank from 8 tests to 3).

- [ ] **Step 2: Smoke-grep the rebuilt bundle**

```bash
grep -c "九月一日\|八月七日\|一月一日\|十月一日" dist/assets/index-*.js
```

Expected: `0` for each (Chinese paragraph text from the deleted body content should not appear in the bundle). The dateLabel strings like `九月一日` survive in the bundled builtin data (`dateLabel: '九月一日'` is still in each entry), so search for fragments of the deleted **body paragraphs** specifically:

```bash
# Use a fragment from any deleted body paragraph; pick one you know was in the source:
grep -c "保羅卻告訴我們" dist/assets/index-*.js
grep -c "全部聖經都是神所默示的" dist/assets/index-*.js
```

The first should be `0` (it was in 01-january.ts body and is deleted). The second is the **verse** text for 09-september entry 1 — it should still be `> 0` because verses are kept.

- [ ] **Step 3: Manual browser smoke test**

```bash
npm run dev
```

In a browser:

1. `/` (Landing) renders, picker works.
2. Pick a day → navigates to `/card/MM/DD`. Card renders with title, verse, verseRef. Floating footer has exactly **two** buttons (hashtag + claim envelope) — no BookOpen book.
3. Click the hashtag button — copies `#AWordForYourDay`, toast appears, disappears after 2s.
4. Click the claim envelope — ClaimDialog opens; ESC and backdrop click close it; submit a valid name+email and verify success state.
5. Visit `/read/5/1` directly — should render `NotFoundPage` (no longer a real route).
6. DevTools → Network on `/`: confirm no requests to anything reading-related and that the JS bundle is smaller than before this change.

---

## Spec coverage check

| Spec section                                                              | Tasks                  |
| ------------------------------------------------------------------------- | ---------------------- |
| Removed: ReadingPage                                                      | 1                      |
| Removed: useDevotionalList                                                | 1                      |
| Removed: /read route                                                      | 3                      |
| Removed: BookOpen button on CardPage                                      | 4                      |
| Removed: reading-only CSS                                                 | 5                      |
| Removed: pages/hooks barrels                                              | 2                      |
| Removed: ListDevotionals                                                  | 7                      |
| Removed: listDevotionals from DI container                                | 8                      |
| Trimmed: DevotionalDTO (drop dateEn, body, reflection, updatedAt, source) | 9                      |
| Removed: DevotionalSummaryDTO, DevotionalInputDTO, DevotionalSource       | 9                      |
| Trimmed: devotionalMapper (drop source param, toSummaryDTO, dead fields)  | 10                     |
| Simplified: GetDevotional (drop source argument)                          | 11                     |
| Trimmed: BuiltInDevotionalSource port (drop has/list)                     | 12                     |
| Trimmed: Devotional entity                                                | 14                     |
| Updated: Devotional.test.ts                                               | 15                     |
| Trimmed: DevotionalRepository interface + DevotionalSummary type          | 16                     |
| Trimmed: FirestoreDevotionalRepository                                    | 17                     |
| Trimmed: BuiltInDevotionalSeed                                            | 18                     |
| Trimmed: InMemoryBuiltInDevotionalSource                                  | 19                     |
| Scrubbed: 12 builtin month files                                          | 20                     |
| Dropped: formatEnglishDate / formatEnglishMonth / EN_MONTHS               | 22                     |
| Updated: README.md Routes table                                           | 24                     |
| Updated: CLAUDE.md page sections + responsive note                        | 25                     |
| Verification gate + bundle smoke + browser smoke                          | 26                     |
| Kept: CardPage (minus BookOpen), claim flow, Landing, NotFound            | (untouched on purpose) |
| Kept: pad2, formatChineseDate, calendar helpers                           | (untouched on purpose) |
