# Import OpenDoors 365-Day Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the contents of all 12 builtin month files with content sourced from `ref/content/OpenDoors 365 days.csv`. Feb 29 mirrors Feb 28's entry.

**Architecture:** One-shot Node ESM script reads the CSV, parses 365 rows, maps day-of-year to month/day via a fixed non-leap calendar, splits the verse column into `verseRef` + `verseTrans` on the last `（…）`, and writes 12 TypeScript files in the existing seed-array pattern. Feb 29 is appended as a copy of Feb 28 with only `day` and `dateLabel` overridden. Prettier formats the output. The script self-deletes after success.

**Tech Stack:** Node ESM (the project is `"type": "module"`), Vitest, Prettier, ESLint, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-05-12-import-opendoors-content-design.md`

---

## Preflight

Confirm the baseline is green and the CSV is present:

```bash
[ -f "ref/content/OpenDoors 365 days.csv" ] && wc -l "ref/content/OpenDoors 365 days.csv"
npm run typecheck && npm run lint && npm test
```

Expected: CSV exists with 366 lines (1 header + 365 data); typecheck + lint + tests all exit 0; tests = 92.

---

## Task 1: Write the import script

**Files:**

- Create: `scripts/import-opendoors.mjs`

- [ ] **Step 1: Create the script directory if needed**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Write `scripts/import-opendoors.mjs` with EXACTLY**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Constants ──────────────────────────────────────────────────────────────

const CSV_PATH = 'ref/content/OpenDoors 365 days.csv';
const OUT_DIR = 'src/infrastructure/data/builtInDevotionals';

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTH_FILES = [
  { name: 'january', file: '01-january.ts', constName: 'januarySeeds' },
  { name: 'february', file: '02-february.ts', constName: 'februarySeeds' },
  { name: 'march', file: '03-march.ts', constName: 'marchSeeds' },
  { name: 'april', file: '04-april.ts', constName: 'aprilSeeds' },
  { name: 'may', file: '05-may.ts', constName: 'maySeeds' },
  { name: 'june', file: '06-june.ts', constName: 'juneSeeds' },
  { name: 'july', file: '07-july.ts', constName: 'julySeeds' },
  { name: 'august', file: '08-august.ts', constName: 'augustSeeds' },
  { name: 'september', file: '09-september.ts', constName: 'septemberSeeds' },
  { name: 'october', file: '10-october.ts', constName: 'octoberSeeds' },
  { name: 'november', file: '11-november.ts', constName: 'novemberSeeds' },
  { name: 'december', file: '12-december.ts', constName: 'decemberSeeds' },
];

// ─── CSV parser ─────────────────────────────────────────────────────────────
// Handles double-quoted fields with embedded commas. The OpenDoors file has
// no quote-inside-quote escaping (no `""`), so we don't support it.

function parseCsv(text) {
  // Strip UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map(parseLine);
}

function parseLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

function dayOfYearToMonthDay(d) {
  let remaining = d;
  for (let m = 0; m < 12; m++) {
    if (remaining <= MONTH_LENGTHS[m]) return { month: m + 1, day: remaining };
    remaining -= MONTH_LENGTHS[m];
  }
  throw new Error(`day-of-year out of range: ${d}`);
}

// The CSV `verse` column is e.g. `哥林多前書13:1（現中修訂版）`.
// Some scripture text contains earlier inline `（…）` (e.g. speaker tags),
// so we split on the LAST `（…）` pair to extract the translation.
function splitVerseColumn(s) {
  const lastOpen = s.lastIndexOf('（');
  const lastClose = s.lastIndexOf('）');
  if (lastOpen < 0 || lastClose <= lastOpen) {
    return { verseRef: s.trim(), verseTrans: '' };
  }
  return {
    verseRef: s.slice(0, lastOpen).trim(),
    verseTrans: s.slice(lastOpen + 1, lastClose).trim(),
  };
}

// ─── TS emission ────────────────────────────────────────────────────────────
// Emit single-quoted string literals. Chinese content has no single-quote
// chars; escape backslashes defensively even though none are expected.
function toJsString(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderEntry(seed) {
  return `  {
    month: ${seed.month},
    day: ${seed.day},
    dateLabel: ${toJsString(seed.dateLabel)},
    title: ${toJsString(seed.title)},
    verseRef: ${toJsString(seed.verseRef)},
    verseTrans: ${toJsString(seed.verseTrans)},
    verse: ${toJsString(seed.verse)},
  },`;
}

function renderFile(constName, seeds) {
  const entries = seeds.map(renderEntry).join('\n');
  return `import type { BuiltInDevotionalSeed } from './types';

export const ${constName}: readonly BuiltInDevotionalSeed[] = [
${entries}
];
`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const text = readFileSync(resolve(CSV_PATH), 'utf8');
  const rows = parseCsv(text);

  const header = rows.shift();
  if (
    !header ||
    header[0] !== 'day' ||
    header[1] !== 'date' ||
    header[2] !== 'title' ||
    header[3] !== 'scripture' ||
    header[4] !== 'verse'
  ) {
    throw new Error(`Unexpected CSV header: ${JSON.stringify(header)}`);
  }

  if (rows.length !== 365) {
    throw new Error(`Expected 365 data rows, got ${rows.length}`);
  }

  const byMonth = Array.from({ length: 12 }, () => []);

  for (const row of rows) {
    const [dayStr, date, title, scripture, verseCol] = row;
    const dayOfYear = Number(dayStr);
    const { month, day } = dayOfYearToMonthDay(dayOfYear);
    const { verseRef, verseTrans } = splitVerseColumn(verseCol);

    byMonth[month - 1].push({
      month,
      day,
      dateLabel: date,
      title,
      verseRef,
      verseTrans,
      verse: scripture,
    });
  }

  // Feb 29 mirror: copy Feb 28's entry and override day + dateLabel.
  const february = byMonth[1];
  const feb28 = february.find((e) => e.day === 28);
  if (!feb28) throw new Error('Feb 28 entry not found — cannot mirror to Feb 29');
  february.push({ ...feb28, day: 29, dateLabel: '二月二十九日' });

  // Sanity: per-month counts.
  const expectedCounts = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  byMonth.forEach((arr, i) => {
    if (arr.length !== expectedCounts[i]) {
      throw new Error(`Month ${i + 1}: expected ${expectedCounts[i]} entries, got ${arr.length}`);
    }
  });

  let totalBytes = 0;
  let totalEntries = 0;
  MONTH_FILES.forEach((m, i) => {
    const seeds = byMonth[i];
    const src = renderFile(m.constName, seeds);
    const outPath = resolve(`${OUT_DIR}/${m.file}`);
    writeFileSync(outPath, src);
    totalBytes += src.length;
    totalEntries += seeds.length;
    console.log(`${m.file}: ${seeds.length} entries, ${src.length} bytes`);
  });

  console.log(`\nTotal: ${totalEntries} entries (365 CSV + 1 Feb 29 mirror), ${totalBytes} bytes`);
}

main();
```

---

## Task 2: Run the import script

- [ ] **Step 1: Execute**

```bash
node scripts/import-opendoors.mjs
```

Expected console output: 12 lines (one per file) followed by a totals line:

```
01-january.ts: 31 entries, <N> bytes
02-february.ts: 29 entries, <N> bytes
03-march.ts: 31 entries, <N> bytes
04-april.ts: 30 entries, <N> bytes
05-may.ts: 31 entries, <N> bytes
06-june.ts: 30 entries, <N> bytes
07-july.ts: 31 entries, <N> bytes
08-august.ts: 31 entries, <N> bytes
09-september.ts: 30 entries, <N> bytes
10-october.ts: 31 entries, <N> bytes
11-november.ts: 30 entries, <N> bytes
12-december.ts: 31 entries, <N> bytes

Total: 366 entries (365 CSV + 1 Feb 29 mirror), <N> bytes
```

If any sanity check fails (header mismatch, row count != 365, month count mismatch, Feb 28 not found), the script will throw with a descriptive error. Report BLOCKED with the error message and do not proceed to formatting.

---

## Task 3: Format the generated files with Prettier

The script emits compact single-line entries. Prettier will re-flow long verse strings into the project's existing wrap style.

- [ ] **Step 1: Run prettier on the generated files**

```bash
npm run format
```

Expected: Prettier reports formatting many files; the 12 builtin TS files are the ones that changed materially. Exit 0.

---

## Task 4: Spot-check generated entries against CSV

- [ ] **Step 1: Verify Day 1 → January 1**

```bash
head -16 src/infrastructure/data/builtInDevotionals/01-january.ts
```

Expected: the first entry contains:

- `month: 1`
- `day: 1`
- `dateLabel: '一月一日'`
- `title: '我們愛，因為上帝先愛我們'`
- `verseRef: '哥林多前書13:1'`
- `verseTrans: '現中修訂版'`
- `verse: '「要是沒有愛，我的話就像吵鬧的鑼和響亮的鈸一樣。」'`

- [ ] **Step 2: Verify Day 59 → February 28**

```bash
grep -A8 "day: 28," src/infrastructure/data/builtInDevotionals/02-february.ts | head -10
```

Expected output contains:

- `dateLabel: '二月二十八日'`
- `title: '你的苦難彰顯了上帝的目的'`
- `verseRef: '哥林多後書1:4,6'`
- `verseTrans: '新普及譯本'`

- [ ] **Step 3: Verify the Feb 29 mirror exists and matches Feb 28's content**

```bash
grep -A8 "day: 29," src/infrastructure/data/builtInDevotionals/02-february.ts | head -10
```

Expected output contains:

- `month: 2`
- `day: 29`
- `dateLabel: '二月二十九日'` (note: not from the CSV — explicit override)
- `title: '你的苦難彰顯了上帝的目的'` (same as Feb 28)
- `verseRef: '哥林多後書1:4,6'` (same as Feb 28)
- `verseTrans: '新普及譯本'` (same as Feb 28)
- The `verse` string matches Feb 28's

- [ ] **Step 4: Verify Day 60 → March 1**

```bash
head -16 src/infrastructure/data/builtInDevotionals/03-march.ts
```

Expected: the first entry has `month: 3`, `day: 1`, `dateLabel: '三月一日'`.

- [ ] **Step 5: Verify Day 365 → December 31**

```bash
tail -16 src/infrastructure/data/builtInDevotionals/12-december.ts
```

Expected: the last entry has `month: 12`, `day: 31`, `dateLabel: '十二月三十一日'`, `title: '堅持禱告'`, `verseRef: '以弗所書6:18'`, `verseTrans: '新普及譯本'`.

---

## Task 5: Run the full gate

- [ ] **Step 1: Run typecheck + lint + build + test**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: each exits 0. Tests: 92 passing (no test touches the content directly; the builtin source still indexes and serves entries the same way as before).

If typecheck fails on the generated files: report the error. Most likely cause would be an unescaped character in `toJsString` or a missing comma — fix in the script (Task 1), re-run import (Task 2), re-format (Task 3), re-run gate.

---

## Task 6: Clean up the import script

- [ ] **Step 1: Delete the one-shot script and (if empty) the scripts directory**

```bash
rm scripts/import-opendoors.mjs
rmdir scripts 2>/dev/null || true
```

Expected: the file is gone. `rmdir` succeeds silently if `scripts/` is empty after the delete; if other scripts exist there, `rmdir` fails harmlessly (the `|| true` swallows the error).

---

## Task 7: Hand off the manual smoke test

The controller (i.e. the agent running this plan) cannot drive a browser. Tell the user to perform these checks themselves before calling the import complete:

1. `npm run dev`
2. Visit `/card/1/1` — confirm title `我們愛，因為上帝先愛我們` and reference `哥林多前書13:1（現中修訂版）`
3. Visit `/card/2/28` — confirm `你的苦難彰顯了上帝的目的`
4. Visit `/card/2/29` — confirm same content as Feb 28
5. Visit `/card/3/1` — confirm content differs from Feb 28
6. Visit `/card/5/12`, `/card/12/31` — spot-check a few more days
7. Confirm no day shows the generic placeholder `為這一日感恩` (except for any malformed URL like `/card/2/30`, which is correct fallback behavior)

If any rendered card shows the placeholder or shows wrong content, that indicates a content/parse bug — report it and stop.

---

## Spec coverage check

| Spec section                                                                | Tasks       |
| --------------------------------------------------------------------------- | ----------- |
| Read & parse CSV with quoted-field handling                                 | 1           |
| Map day-of-year → (month, day) via non-leap calendar                        | 1           |
| Split verse column on last `（…）` to extract verseRef + verseTrans         | 1           |
| Discard `pdf_page` column                                                   | 1           |
| Feb 29 mirror of Feb 28 with overridden day + dateLabel                     | 1           |
| Emit 12 month files matching existing seed-array pattern                    | 1           |
| Group by month; sanity-check per-month counts                               | 1           |
| Run the script, verify output                                               | 2           |
| Format with Prettier                                                        | 3           |
| Spot-check days 1, 59, 60, 365 + Feb 29 mirror                              | 4           |
| Full gate: typecheck + lint + build + test                                  | 5           |
| Clean up the one-shot script                                                | 6           |
| Manual browser smoke (handed off to user)                                   | 7           |
| Kept: BuiltInDevotionalSeed schema, builtin source impl, placeholder DTO    | (untouched) |
| Out of scope: typography for long verses, dateLabel validation, CSV pruning | (none)      |
