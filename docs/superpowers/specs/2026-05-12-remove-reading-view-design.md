# Remove reading view (with full dead-content sweep)

## Goal

Delete the long-form devotional reading view (`/read/:month/:day`) and every piece of authored content and supporting type/use-case/CSS that exists only to feed it. After this change the app has two user-facing surfaces: the landing page and the card screen.

## Motivation

The reading view's `body[]` paragraphs and `reflection` prompts contain potentially copyrighted devotional writing. To respect the rights of the original authors, that content must be removed from the codebase _and_ from git history equivalents — the working tree is the only record of it. The reading view itself, the route, and all CSS/data fields that exist only to feed it should go with it. As a bonus, this lets us sweep up admin-era dead code (summary list, `dateEn`, `updatedAt`) that's been unreachable since the auth removal.

## Scope

### Removed

**Presentation**

- `src/presentation/pages/ReadingPage.tsx`
- `/read/:month/:day` route + `ReadingPage` import in `src/presentation/routes/AppRouter.tsx`
- BookOpen `<Link>` in `src/presentation/pages/CardPage.tsx` (the three-button floating footer becomes two: hashtag + claim) plus the `BookOpen` token from the `lucide-react` import
- `src/presentation/hooks/useDevotionalList.ts` (zero callers since admin removal)
- Reading-only CSS in `src/presentation/styles/global.css` (~25 selectors):
  - `.section-reading`
  - `.reading-sticky-bar`, `.reading-condensed-bar`, `.reading-condensed-date`, `.reading-condensed-divider`, `.reading-condensed-title`
  - `.reading-datetag-row`, `.reading-title`, `.reading-divider`, `.reading-body`
  - `.reading-source-mark`, `.reading-source-mark--quiet`
  - `.reading-end-actions`, `.reading-action-btn`, `.reading-action-btn--copied`, `.reading-action-btn-label`
  - `.verse-block`, `.verse-tick`, `.verse-text`, `.verse-ref`, `.verse-trans` (Card uses its own `.card-verse` / `.card-ref`)
  - `.reflect-card`, `.reflect-label`, `.reflect-text`
  - `.scroll-top-fab`
- Re-exports for the above in `pages/index.ts` and `hooks/index.ts`

**Application**

- `src/application/use-cases/ListDevotionals.ts` (admin-era dead code) + barrel entry
- From `src/infrastructure/di/container.ts`: drop `listDevotionals` from the `UseCases` interface and from `buildContainer()` body, and drop the `ListDevotionals` import. Final `UseCases`: `getDevotional`, `submitClaim`, `checkForUpdate`.
- From `src/application/dto/DevotionalDTO.ts`: drop `dateEn`, `body`, `reflection`, `updatedAt`, `source` fields on `DevotionalDTO`. Delete `DevotionalSummaryDTO`, `DevotionalInputDTO`, `DevotionalSource` entirely. Update `dto/index.ts`.
- From `src/application/mappers/devotionalMapper.ts`: drop the `source` parameter and dead-field mapping in `toDevotionalDTO`. Delete `toSummaryDTO`. Trim `buildPlaceholderDTO` to the Card-only field set.
- From `src/application/ports/BuiltInDevotionalSource.ts`: drop `has()` and `list()` methods from the interface.
- From `src/application/use-cases/GetDevotional.ts`: drop the `'firestore'` / `'builtin'` source argument threaded into `toDevotionalDTO`.

**Domain**

- From `src/domain/entities/Devotional.ts`: drop `dateEn`, `body`, `reflection`, `updatedAt` from `DevotionalProps` and from `create(...)` input. Drop the "body must contain at least one paragraph" validation. Drop `dateEn` from the required-fields list.
- Rewrite `src/domain/entities/Devotional.test.ts` against the trimmed entity (drop body/reflection/dateEn tests).
- From `src/domain/repositories/DevotionalRepository.ts`: drop `list()` method, delete `DevotionalSummary` type. Update `repositories/index.ts`.

**Infrastructure**

- From `src/infrastructure/repositories/FirestoreDevotionalRepository.ts`: drop `list()` method; drop `DevotionalSummary` import; drop `Timestamp`, `collection`, `getDocs`, `orderBy`, `query` imports; trim `DevotionalDoc` interface and `toEntity` to Card fields.
- From `src/infrastructure/data/builtInDevotionals/index.ts`: drop `summaries` field, `BUILTIN_UPDATED_AT` constant, `list()` method, `has()` method. Trim `Devotional.create(...)` call to remaining fields.
- From `src/infrastructure/data/builtInDevotionals/types.ts`: drop `dateEn`, `body`, `reflection` from `BuiltInDevotionalSeed`.
- From all 12 month files (`01-january.ts` … `12-december.ts`): every entry loses `dateEn`, `body`, `reflection`. **About 5,400 lines of authored Chinese devotional content are permanently deleted.** Files shrink from ~600 lines to ~150 each.

**Shared**

- From `src/shared/date/format.ts`: delete `formatEnglishDate`, `formatEnglishMonth`, and the `EN_MONTHS` constant (no callers after this cleanup).
- Update `src/shared/date/index.ts` barrel.

**Docs**

- `README.md`: drop the `/read/:month/:day` row from the Routes table.
- `CLAUDE.md`: drop `section-reading` from the "Page sections" line under "Existing utility / semantic classes".

### Kept untouched

- Landing page, Card page (minus the BookOpen button), NotFoundPage
- `ClaimDialog`, `SubmitClaim`, `FirestoreClaimRepository`, claim flow end-to-end
- `useDevotional`, `useDayParams`, `useContainer`, `useTheme`, `useUpdateAvailable`
- `DateTag`, `PageHeader`, `PageFooter`, `Brand`, `ThemeToggle`, `DrumPicker`, `UpdateToast`
- `GetDevotional` use case (Card still uses it) — the `source` plumbing simplifies away but the use case stays
- `formatChineseDate` / `formatChineseDay` / `formatChineseMonth` / calendar helpers
- `firestore.rules` (already read-only after auth removal)
- All design tokens, fonts, theming

### Final `Devotional` shape

```ts
interface DevotionalProps {
  readonly key: DayKey;
  readonly dateLabel: string; // "五月一日"
  readonly title: string;
  readonly verseRef: string; // "詩篇 118:24"
  readonly verseTrans: string; // "新譯本"
  readonly verse: string;
}
```

### Final `DevotionalDTO` shape

```ts
interface DevotionalDTO {
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

## Order of execution

Outside-in, like the auth removal — but with one nuance: **domain entity trim and the infrastructure code that produces the entity must change together in a single atomic phase**, because the entity type and its producers (FirestoreDevotionalRepository.toEntity, InMemoryBuiltInDevotionalSource.buildIndex, builtin seed types) are mutually constrained — neither side can be the trimmed shape while the other side isn't.

1. **Presentation** — delete ReadingPage, useDevotionalList; update AppRouter, CardPage, pages/hooks barrels; strip reading-only CSS. Build stays green (the deleted hook's use case becomes orphaned but consistent).
2. **Application + container** — delete `ListDevotionals` + barrel; update `container.ts`; trim DTO/mapper/port/`GetDevotional`; update dto/ports barrels. Build stays green (entity and infra still produce full shape; mapper just stops reading the dropped fields).
3. **Domain + infrastructure (atomic)** — trim `Devotional` entity + tests; trim `DevotionalRepository` interface + barrel; trim `FirestoreDevotionalRepository` + `InMemoryBuiltInDevotionalSource` + `BuiltInDevotionalSeed`; rewrite every `{01..12}-*.ts` builtin file (drop `dateEn`, `body`, `reflection` from each entry). All of these must land together to keep the build green.
4. **Shared** — delete `formatEnglishDate` / `formatEnglishMonth` / `EN_MONTHS`; update barrel.
5. **Docs** — update README.md and CLAUDE.md.
6. **Verification** — `npm run typecheck && npm run lint && npm run build && npm test`. Smoke-grep the rebuilt `dist/assets/index-*.js` bundle for fragments of the deleted content to confirm nothing leaked through. Visit `/read/5/1` in a browser — should fall through to NotFoundPage.

## Verification details

After the cleanup, beyond the standard gate, run:

```bash
# Smoke-check the rebuilt bundle for known fragments of the deleted text
grep -c '九月一日\|八月七日\|reflection\|body' dist/assets/index-*.js || true
```

A clean bundle should not contain the Chinese paragraph text or the `body` / `reflection` field names that drove the reading view. (The literal strings `reflection` / `body` may appear in unrelated places — minified property names, e.g. `document.body` in ClaimDialog — so this is a smoke check, not an absolute proof. The structural deletions in the source are the real guarantee.)

## Risks and known consequences

- **Authored Chinese devotional content (~5,400 lines) is permanently deleted from the working tree.** No git history preserves it because the project is not under git. This is the explicit intent (copyright / IP-respect rationale), but the deletion is irreversible without restoring from a separate backup.
- **Anything already deployed to Firebase Hosting still serves the old bundle** (which contains the body/reflection text) until you run `npm run deploy` after this change lands. The cleanup is only meaningful end-to-end post-redeploy.
- **Firestore docs** under `devotionals/` in production may still contain `body`, `reflection`, `dateEn`, `updatedAt` fields. After this change the repo no longer reads those fields, so they're harmless, but they're not actively deleted server-side. The console can clean them if you want fully tidy docs.
- **`source: 'firestore' | 'builtin' | 'placeholder'` plumbing goes away.** No remaining UI cares which source served a given day. Behavior is preserved (Firestore overrides builtin overrides placeholder), only the metadata vanishes.

## Out of scope

- Adding any replacement long-form reading experience.
- Migrating or scrubbing existing Firestore `devotionals/` documents (their stale `body`/`reflection` fields stay unread).
- Reorganizing the builtin data structure beyond field trimming.
- Anything related to the Card screen besides removing the one BookOpen button.
