import { useCallback, useState } from 'react';

// Module-level cache for the Landing picker's selected month/day. Module
// state survives in-app navigation (e.g. tapping "另選日期" on the card to
// return here) but is reset on a real browser reload, since refreshing
// re-evaluates the module and re-runs the `new Date()` below.
const today = new Date();
let cachedMonth = today.getMonth() + 1;
let cachedRequestedDay = today.getDate();

export interface LandingDate {
  readonly month: number;
  readonly requestedDay: number;
  readonly setMonth: (value: number) => void;
  readonly setRequestedDay: (value: number) => void;
}

export const useLandingDate = (): LandingDate => {
  const [month, setMonthState] = useState(cachedMonth);
  const [requestedDay, setRequestedDayState] = useState(cachedRequestedDay);

  const setMonth = useCallback((value: number) => {
    cachedMonth = value;
    setMonthState(value);
  }, []);

  const setRequestedDay = useCallback((value: number) => {
    cachedRequestedDay = value;
    setRequestedDayState(value);
  }, []);

  return { month, requestedDay, setMonth, setRequestedDay };
};
