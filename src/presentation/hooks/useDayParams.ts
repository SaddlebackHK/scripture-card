import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export interface DayParams {
  readonly month: number;
  readonly day: number;
}

const parse = (rawMonth: string | undefined, rawDay: string | undefined): DayParams | null => {
  const m = Number(rawMonth);
  const d = Number(rawDay);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;
  return { month: m, day: d };
};

// Reads `:month` and `:day` from the current route and parses them. Returns
// null if either segment is missing or out of broad calendar range — pages
// typically render a "not found" view in that case. Validation here is
// range-only (1–12 / 1–31); use DayKey.create in the application layer for
// strict per-month bounds.
export const useDayParams = (): DayParams | null => {
  const { month, day } = useParams<{ month: string; day: string }>();
  return useMemo(() => parse(month, day), [month, day]);
};
