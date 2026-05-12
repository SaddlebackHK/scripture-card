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
