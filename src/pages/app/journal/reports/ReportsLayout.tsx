import { Outlet } from 'react-router-dom';
import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';

/**
 * JournalReportsLayout — shared layout for all /app/journal/reports/* sub-routes.
 * Renders the tab nav once; each sub-page is rendered via <Outlet />.
 * Pages manage their own padding (px-4 md:px-6 py-6) — no double-padding here.
 */
export default function JournalReportsLayout() {
  return (
    <>
      <ReportsTabsNav />
      <Outlet />
    </>
  );
}
