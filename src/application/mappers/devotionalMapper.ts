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
