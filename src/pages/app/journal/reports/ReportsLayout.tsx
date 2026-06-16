import { Outlet } from 'react-router-dom';
import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';
import { FinoExplains } from '@/components/fino/FinoExplains';

/**
 * JournalReportsLayout — shared layout for all /app/journal/reports/* sub-routes.
 * Renders the tab nav once; each sub-page is rendered via <Outlet />.
 * Pages manage their own padding (px-4 md:px-6 py-6) — no double-padding here.
 */
export default function JournalReportsLayout() {
  return (
    <>
      <div className="relative px-4 pt-4 sm:px-6">
        <FinoExplains
          title="What are the Journal Reports?"
          className="mt-ds-3 ml-auto w-fit"
        >
          Your trading, fully X-rayed. This analytics suite breaks your performance down every way
          that matters — win rate, risk, day-by-day, by strategy and by setup — so you can see
          what's working and what's costing you.
        </FinoExplains>
      </div>
      <ReportsTabsNav />
      <Outlet />
    </>
  );
}
