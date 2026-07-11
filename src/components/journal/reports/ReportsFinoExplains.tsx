import { FinoExplains } from '@/components/fino/FinoExplains';

/**
 * Shared "What are the Journal Reports?" Fino Explains block for the reports
 * surface. Rendered by ReportsLayout for most tabs (directly under the tab
 * nav). On the AI Summary tab it is rendered INSIDE the route instead — below
 * the JournalFeatureGate "Leak Detector — Preview" banner — so the order reads
 * tabs → preview banner → Fino Explains. Kept in one place so the copy never
 * drifts between the two mount points.
 */
export function ReportsFinoExplains() {
  return (
    <div className="relative px-4 pt-4 sm:px-6">
      <FinoExplains title="What are the Journal Reports?" className="ml-auto w-fit">
        Your trading, fully X-rayed. This analytics suite breaks your performance down every way
        that matters — win rate, risk, day-by-day, by strategy and by setup — so you can see
        what's working and what's costing you.
      </FinoExplains>
    </div>
  );
}

export default ReportsFinoExplains;
