import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '@shared/result';
import { TOTAL_DAYS } from '@shared/date';
import { DayKey } from './DayKey';

describe('DayKey', () => {
  describe('create', () => {
    it('produces a zero-padded MM-DD key for a valid month and day', () => {
      const result = DayKey.create(8, 7);
      expect(isOk(result) && result.value).toBe('08-07');
    });

    it('accepts February 29 (leap-day entries are valid)', () => {
      expect(isOk(DayKey.create(2, 29))).toBe(true);
    });

    it('rejects February 30', () => {
      expect(isErr(DayKey.create(2, 30))).toBe(true);
    });

    it('rejects months outside 1..12', () => {
      expect(isErr(DayKey.create(0, 1))).toBe(true);
      expect(isErr(DayKey.create(13, 1))).toBe(true);
    });

    it('rejects days outside the month range', () => {
      expect(isErr(DayKey.create(1, 0))).toBe(true);
      expect(isErr(DayKey.create(1, 32))).toBe(true);
      expect(isErr(DayKey.create(4, 31))).toBe(true);
    });

    it('rejects non-integer values', () => {
      expect(isErr(DayKey.create(1.5, 1))).toBe(true);
      expect(isErr(DayKey.create(1, 1.5))).toBe(true);
      expect(isErr(DayKey.create(Number.NaN, 1))).toBe(true);
    });
  });

  describe('parse', () => {
    it('round-trips a valid MM-DD string', () => {
      const result = DayKey.parse('08-07');
      expect(isOk(result) && result.value).toBe('08-07');
    });

    it('rejects malformed input', () => {
      expect(isErr(DayKey.parse('8-7'))).toBe(true);
      expect(isErr(DayKey.parse('08/07'))).toBe(true);
      expect(isErr(DayKey.parse('not-a-date'))).toBe(true);
    });

    it('rejects values outside the calendar range', () => {
      expect(isErr(DayKey.parse('13-01'))).toBe(true);
      expect(isErr(DayKey.parse('02-30'))).toBe(true);
    });
  });

  describe('monthOf / dayOf', () => {
    it('extracts month and day numerically', () => {
      const created = DayKey.create(11, 3);
      if (!isOk(created)) throw new Error('precondition');
      expect(DayKey.monthOf(created.value)).toBe(11);
      expect(DayKey.dayOf(created.value)).toBe(3);
    });
  });

  describe('allKeys', () => {
    it('enumerates every calendar day (366 incl. Feb 29)', () => {
      const keys = DayKey.allKeys();
      expect(keys).toHaveLength(TOTAL_DAYS);
      expect(keys[0]).toBe('01-01');
      expect(keys[keys.length - 1]).toBe('12-31');
      expect(keys).toContain('02-29');
    });

    it('produces only well-formed keys', () => {
      const keys = DayKey.allKeys();
      keys.forEach((k) => {
        expect(k).toMatch(/^\d{2}-\d{2}$/);
      });
    });
  });
});
