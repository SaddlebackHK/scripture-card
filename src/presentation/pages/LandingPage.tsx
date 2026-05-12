import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MONTHS, daysInMonth, formatChineseMonth } from '@shared/date';
import { DrumPicker, PageFooter, PageHeader } from '@presentation/components';
import { useViewport } from '@presentation/hooks';

export const LandingPage = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [requestedDay, setRequestedDay] = useState<number>(today.getDate());
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
