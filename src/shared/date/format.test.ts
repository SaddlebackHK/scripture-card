import { describe, expect, it } from 'vitest';
import { formatChineseDate, formatChineseDay, formatChineseMonth } from './format';

describe('formatChineseMonth', () => {
  it.each([
    [1, '一'],
    [10, '十'],
    [11, '十一'],
    [12, '十二'],
  ])('month %i → %s', (month, expected) => {
    expect(formatChineseMonth(month)).toBe(expected);
  });

  it('falls back to the digit string for out-of-range months', () => {
    expect(formatChineseMonth(13)).toBe('13');
    expect(formatChineseMonth(0)).toBe('0');
  });
});

describe('formatChineseDay', () => {
  it.each([
    [1, '一'],
    [5, '五'],
    [9, '九'],
    [10, '十'],
    [11, '十一'],
    [15, '十五'],
    [19, '十九'],
    [20, '二十'],
    [21, '二十一'],
    [29, '二十九'],
    [30, '三十'],
    [31, '三十一'],
  ])('day %i → %s', (day, expected) => {
    expect(formatChineseDay(day)).toBe(expected);
  });

  it('falls back to the digit string for out-of-range days', () => {
    expect(formatChineseDay(0)).toBe('0');
    expect(formatChineseDay(32)).toBe('32');
  });
});

describe('formatChineseDate', () => {
  it('combines month and day with the standard separators', () => {
    expect(formatChineseDate(8, 7)).toBe('八月七日');
    expect(formatChineseDate(12, 31)).toBe('十二月三十一日');
    expect(formatChineseDate(2, 29)).toBe('二月二十九日');
  });
});
