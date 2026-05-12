// Maximum number of days in each month, indexed 0-11. February uses 29 because
// the calendar-day data model treats Feb 29 as a valid entry in any year.
export const MAX_DAYS_PER_MONTH: readonly number[] = [
  31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];

export const MONTHS: readonly number[] = Array.from({ length: 12 }, (_, i) => i + 1);

export const TOTAL_DAYS = MAX_DAYS_PER_MONTH.reduce((acc, n) => acc + n, 0);

export const daysInMonth = (month: number): number => MAX_DAYS_PER_MONTH[month - 1] ?? 31;

export const pad2 = (n: number): string => (n < 10 ? `0${String(n)}` : String(n));
