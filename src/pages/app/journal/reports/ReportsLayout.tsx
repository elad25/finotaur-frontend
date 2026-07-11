import { Outlet, useLocation } from 'react-router-dom';
import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';
import { ReportsFinoExplains } from '@/components/journal/reports/ReportsFinoExplains';

/**
 * JournalReportsLayout — shared layout for all /app/journal/reports/* sub-routes.
 * Renders the tab nav once; each sub-page is rendered via <Outlet />.
 * Pages manage their own padding (px-4 md:px-6 py-6) — no double-padding here.
 */
export default function JournalReportsLayout() {
  const { pathname } = useLocation();
  // On the AI Summary tab, Fino Explains is rendered INSIDE the route (below
  // the gate's "Leak Detector — Preview" banner) so the order reads
  // tabs → preview banner → Fino Explains. Every other tab renders it here.
  const finoInPage = pathname.startsWith('/app/journal/reports/ai-summary');

  return (
    <>
      <ReportsTabsNav />
      {!finoInPage && <ReportsFinoExplains />}
      <Outlet />
    </>
  );
}
