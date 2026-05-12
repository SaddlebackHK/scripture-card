# Import OpenDoors 365-day content as the builtin devotionals

## Goal

Replace the contents of all 12 builtin month files with content sourced from `ref/content/OpenDoors 365 days.csv`. The CSV becomes the single source of truth; no merging with existing content. Feb 29 mirrors Feb 28's entry so leap-year visitors see real content instead of the generic placeholder.

## Motivation

The previous round emptied the builtin TS files' `body`/`reflection` fields (copyright cleanup) and left them with the original title/verse data. The user has acquired a cleared OpenDoors 365-day devotional set and wants the app's content to come from there going forward. This is a content-only replacement — schema, types, and runtime all stay exactly as they are.

## Scope

### Source data

- File: `ref/content/OpenDoors 365 days.csv`
- 365 rows + header
- Columns: `day, date, title, scripture, verse, pdf_page`
- All rows confirmed parseable: CSV escaping limited to quoted fields with embedded commas (~14 rows); every row has a `（translation）` marker in the `verse` column.
- Day-of-year follows a **non-leap year** mapping: Feb 28 = day 59, Mar 1 = day 60. No Feb 29 row.

### Field mapping (CSV → seed)

| CSV column    | Seed field                | Notes                                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `day` (1-365) | computed → `month`, `day` | Via fixed `[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]` lookup.                                                                                                                                                                                                                     |
| `date`        | `dateLabel`               | Verbatim (e.g. `一月一日`).                                                                                                                                                                                                                                                              |
| `title`       | `title`                   | Verbatim.                                                                                                                                                                                                                                                                                |
| `scripture`   | `verse`                   | Verbatim — this is the actual scripture text inside `「…」`.                                                                                                                                                                                                                             |
| `verse`       | `verseRef` + `verseTrans` | Split on the **last** `（…）` pair: text before becomes `verseRef`; text inside the parens becomes `verseTrans`. Some scripture text contains earlier inline `（…）` (e.g., speaker tags like `（耶穌）`) — taking the **last** pair, not the first, correctly extracts the translation. |
| `pdf_page`    | discarded                 | —                                                                                                                                                                                                                                                                                        |

### Feb 29 handling

Mirror Feb 28's OpenDoors entry into Feb 29. After the script builds the `februarySeeds` array from the CSV (28 entries), append a 29th entry that is a shallow copy of the day-28 entry with only two fields overridden: `day: 29` and `dateLabel: '二月二十九日'`. Title/verse/verseRef/verseTrans are reused as-is. Leap-year visitors then see meaningful content instead of the generic "為這一日感恩" placeholder.

### Output

All 12 files in `src/infrastructure/data/builtInDevotionals/` are **fully overwritten** by the import script:

- `01-january.ts` (31 entries)
- `02-february.ts` (29 entries — 28 from CSV + 1 mirrored Feb 29)
- `03-march.ts` … `12-december.ts` (lengths matching `MAX_DAYS_PER_MONTH`)

Each file follows the exact existing pattern: `import type { BuiltInDevotionalSeed } from './types';` then a single `export const {month}Seeds: readonly BuiltInDevotionalSeed[] = [ … ];`. Entries are emitted in day order. Field order inside each entry: `month, day, dateLabel, title, verseRef, verseTrans, verse` (matching the current files exactly so prettier output is stable).

### Import script

- Path: `scripts/import-opendoors.mjs`
- Runtime: Node ESM (matches the project's `"type": "module"`)
- Responsibilities:
  1. Read `ref/content/OpenDoors 365 days.csv` as UTF-8
  2. Parse with a small hand-rolled CSV parser that handles double-quoted fields with embedded commas (no escaped quotes inside quotes occur in the source — the parser doesn't need to support `""`)
  3. For each row, compute `(month, day)` from the day-of-year using the non-leap calendar; split the `verse` column on the last `（…）` to get `verseRef` and `verseTrans`
  4. Group rows by month into 12 arrays of seeds
  5. Append the Feb 29 mirror entry to `februarySeeds`
  6. For each month, render the TS source as a string (template literal) and write it via `fs.writeFileSync` to the corresponding file
  7. Print a summary: bytes written per file, total entry count (should be 366: 365 CSV + 1 mirrored)
- Run once: `node scripts/import-opendoors.mjs`
- Delete the script after the import succeeds (one-shot tool, no need to keep it in the repo).

### What stays untouched

- `BuiltInDevotionalSeed` interface (already matches the Card-relevant fields exactly)
- `InMemoryBuiltInDevotionalSource` implementation
- `buildPlaceholderDTO` (still the fallback for any future day that has no entry)
- `Devotional` entity, `DevotionalDTO`, `devotionalMapper`, `GetDevotional` use case
- `CardPage`, `LandingPage`, `useDevotional`, all hooks
- `firestore.rules`, `README.md`, `CLAUDE.md`
- The CSV itself stays in `ref/content/` as the authoritative source

### Verification

- `npm run typecheck && npm run lint && npm run build && npm test` — all green
- Tests: 92 passing (no test touches the content directly)
- Spot-check 4 generated entries against the CSV:
  - Day 1 → `januarySeeds[0]`: `dateLabel === '一月一日'`, `title === '我們愛，因為上帝先愛我們'`, `verseRef === '哥林多前書13:1'`, `verseTrans === '現中修訂版'`
  - Day 59 (Feb 28) → `februarySeeds[27]`
  - Day 60 (Mar 1) → `marchSeeds[0]`
  - Day 365 (Dec 31) → `decemberSeeds[30]`
- Spot-check the Feb 29 mirror: `februarySeeds[28].day === 29`, `dateLabel === '二月二十九日'`, all other fields identical to `februarySeeds[27]` (Feb 28).
- Browser smoke (`npm run dev`): visit `/card/1/1`, `/card/2/28`, `/card/2/29`, `/card/3/1`, `/card/5/12`, `/card/12/31`. Confirm rendered content matches the CSV. Confirm Feb 29 shows the same content as Feb 28.

## Out of scope

- **Typography fit for long verses.** Some OpenDoors scriptures are noticeably longer than the previous content (max ~380 Chinese chars vs ~50-100 before). If `.card-verse` overflows or looks cramped, that's a separate typography pass after seeing rendered output — not part of this content import.
- **Validating that each row's `dateLabel` matches the computed (month, day).** We trust the CSV's `date` column. Adding a runtime mismatch check is belt-and-suspenders; skip.
- **Keeping `ref/content/OpenDoors 365 days.csv` under any special build step.** It's a static reference; not bundled, not imported, not validated.
- **Server-side content** — no Firestore docs are touched. The `devotionals` collection was emptied earlier and is no longer read by the app.

## Risks

- All previously-authored content in the 12 month TS files is permanently overwritten. The repo is not under git, so the working tree is the only record. Explicit intent — the user has acquired the OpenDoors set and wants it to be the only source.
- The CSV's `date` column is trusted to match its `day` ordinal. If a row has a mismatch (e.g., a row labeled `三月一日` accidentally landed at day 61), it'll propagate verbatim. The day-1/59/60/365 spot-checks catch the obvious shifts.
- Long verses may visually overflow on the Card screen. Not blocking, but worth a typography pass after the import lands.
- The Feb 29 mirror is a copy of Feb 28's title — readers visiting on Feb 29 in a leap year will see the same content they saw the day before. Considered acceptable; the alternative is the generic placeholder, which is less useful.
