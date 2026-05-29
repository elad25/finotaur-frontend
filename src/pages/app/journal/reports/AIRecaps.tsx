import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';
import CreditsBanner from '@/components/journal/reports/CreditsBanner';
import RecapCard from '@/components/journal/reports/RecapCard';

export default function AIRecaps() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <ReportsTabsNav />

      <div>
        <h2 className="text-2xl font-semibold text-yellow-100">AI Recaps</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Weekly, monthly, and quarterly summaries powered by FINOTAUR AI.
        </p>
      </div>

      <CreditsBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecapCard period="weekly" />
        <RecapCard period="monthly" />
        <RecapCard period="quarterly" />
      </div>
    </div>
  );
}
