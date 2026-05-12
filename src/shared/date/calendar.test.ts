import { describe, expect, it } from 'vitest';
import { MAX_DAYS_PER_MONTH, MONTHS, TOTAL_DAYS, daysInMonth, pad2 } from './calendar';

describe('calendar', () => {
  describe('MONTHS', () => {
    it('lists 1 through 12', () => {
      expect(MONTHS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('MAX_DAYS_PER_MONTH', () => {
    it('uses 29 for February so leap-day entries are valid', () => {
      expect(MAX_DAYS_PER_MONTH[1]).toBe(29);
    });

    it('matches the standard month lengths otherwise', () => {
      expect(MAX_DAYS_PER_MONTH).toEqual([31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    });
  });

  describe('TOTAL_DAYS', () => {
    it('sums to 366', () => {
      expect(TOTAL_DAYS).toBe(366);
    });
  });

  describe('daysInMonth', () => {
    it('returns the canonical count for known months', () => {
      expect(daysInMonth(1)).toBe(31);
      expect(daysInMonth(2)).toBe(29);
      expect(daysInMonth(4)).toBe(30);
      expect(daysInMonth(12)).toBe(31);
    });

    it('falls back to 31 for invalid months', () => {
      expect(daysInMonth(0)).toBe(31);
      expect(daysInMonth(13)).toBe(31);
    });
  });

  describe('pad2', () => {
    it('pads single digits', () => {
      expect(pad2(0)).toBe('00');
      expect(pad2(7)).toBe('07');
      expect(pad2(9)).toBe('09');
    });

    it('leaves double digits as-is', () => {
      expect(pad2(10)).toBe('10');
      expect(pad2(31)).toBe('31');
      expect(pad2(99)).toBe('99');
    });
  });
});
