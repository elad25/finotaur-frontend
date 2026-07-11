import { Outlet, useLocation } from 'react-router-dom';
import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';
import { ReportsFinoExplains } from '@/components/journal/reports/ReportsFinoExplains';
import { PreviewBanner } from '@/components/routes/JournalFeatureGate';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * JournalReportsLayout — shared layout for all /app/journal/reports/* sub-routes.
 * Renders the tab nav once; each sub-page is rendered via <Outlet />.
 * Pages manage their own padding (px-4 md:px-6 py-6) — no double-padding here.
 *
 * The AI Summary tab is gated (<JournalFeatureGate feature="ai-summary" hideBanner>)
 * so free-tier users see it in preview mode. Its "Leak Detector — Preview" banner
 * is rendered HERE, ABOVE the tab nav, so the order reads:
 *   preview banner → tabs → Fino Explains → report.
 * (The gate renders it with hideBanner, delegating the banner to this layout.)
 */
export default function JournalReportsLayout() {
  const { pathname } = useLocation();
  const { isFreeJournal, isLoading } = useSubscription();

  const showAiSummaryPreview =
    !isLoading && isFreeJournal && pathname.startsWith('/app/journal/reports/ai-summary');

  return (
    <>
      {showAiSummaryPreview && <PreviewBanner feature="ai-summary" />}
      <ReportsTabsNav />
      <ReportsFinoExplains />
      <Outlet />
    </>
  );
}
