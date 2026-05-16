import { useNavigate } from 'react-router-dom';
import { preload } from 'react-dom';
import { MONTHS, daysInMonth, formatChineseMonth } from '@shared/date';
import { DrumPicker, PageFooter, PageHeader } from '@presentation/components';
import { useLandingDate, useViewport } from '@presentation/hooks';
import cardBackground from '@presentation/assets/bg.png';

// Chromium-only API. Safari / Firefox return undefined and we fall through
// to preloading — matches their lack of a Data Saver mode anyway.
type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
};

const prefersLessData = (): boolean => {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return false;
  if (conn.saveData === true) return true;
  return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
};

export const LandingPage = () => {
  // Warm the browser HTTP cache for the card-screen background while the user
  // is still picking a date. React 19 hoists this to <link rel="preload"> and
  // dedupes per URL; the asset's content-hashed filename + the long-lived
  // Cache-Control header on /assets/** mean subsequent visits hit the cache.
  // Skip on Data Saver / 2G — those users opted out of speculative downloads.
  if (!prefersLessData()) {
    preload(cardBackground, { as: 'image' });
  }

  const navigate = useNavigate();
  // Date selection persists across in-app navigation (returning here from
  // the card screen restores the user's last pick) but resets to today on
  // a real browser refresh — the hook's cache lives in module state.
  const { month, requestedDay, setMonth, setRequestedDay } = useLandingDate();
  const { width: vw, height: vh } = useViewport();
  const vmin = Math.min(vw, vh);

  // Clamp at render time so a month change never leaves us with an out-of-range day.
  const day = Math.min(requestedDay, daysInMonth(month));
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => i + 1);

  // Fluid DrumPicker dimensions — no upper bound so they scale proportionally with vmin.
  const monthWidth = Math.round(Math.max(92, vmin * 0.15));
  const dayWidth = Math.round(Math.max(72, vmin * 0.12));
  const itemHeight = Math.round(Math.max(48, vmin * 0.085));

  const open = () => {
    void navigate(`/card/${String(month)}/${String(day)}`);
  };

  return (
    <main className="page page-fit">
      <PageHeader />

      <section className="center-grid">
        <div className="landing-hero">
          <p className="kicker">A Word For Your Day</p>
          <p className="landing-prompt">打開你想看的一頁</p>

          <div className="surface landing-pickers">
            <DrumPicker
              ariaLabel="月份"
              items={MONTHS}
              value={month}
              onChange={setMonth}
              width={monthWidth}
              itemHeight={itemHeight}
              formatter={(m) => `${formatChineseMonth(m)}月`}
            />
            <span className="landing-pickers-sep">·</span>
            <DrumPicker
              ariaLabel="日期"
              items={days}
              value={day}
              onChange={setRequestedDay}
              width={dayWidth}
              itemHeight={itemHeight}
            />
          </div>

          <button type="button" onClick={open} className="btn-solid">
            翻開那一日 &nbsp;→
          </button>
        </div>
      </section>

      <PageFooter />
    </main>
  );
};
