import { lazy, Suspense } from 'react';
import { NavLink } from 'react-router-dom';
import { useTabSync } from '@/hooks/useTabSync';
import FundamentalsTabEntry from '@/components/fundamentals/FundamentalsTabEntry';
import FinancialsTabEntry from '@/components/financials/FinancialsTabEntry';
import SkeletonBlock from '@/components/fundamentals/SkeletonBlock';

// Your existing "All Markets" summary page (kept as-is, just lazy loaded)
const AllMarketsSummary = lazy(() => import('@/pages/app/all-markets/Summary'));
// Reuse your existing News page if you have one under stocks or all-markets scope;
// If the file path is different, update the import below accordingly.
const News = lazy(() => import('@/pages/app/all-markets/News'));

export default function AllMarketsSummaryWithTabs() {
  const { active, setActive, linkFor } = useTabSync();

  return (
    <div className="space-y-4">
      {/* Local Sub-Nav inside All-Markets Summary */}
      <div className="flex gap-2 border-b border-[rgba(255,255,255,0.06)] pb-2">
        <TabLink to={linkFor('overview')} active={active==='overview'} onClick={() => setActive('overview')}>
          Overview
        </TabLink>
        <TabLink to={linkFor('fundamentals')} active={active==='fundamentals'} onClick={() => setActive('fundamentals')}>
          Fundamentals
        </TabLink>
        <TabLink to={linkFor('financials')} active={active==='financials'} onClick={() => setActive('financials')}>
          Financials
        </TabLink>
        <TabLink to={linkFor('news')} active={active==='news'} onClick={() => setActive('news')}>
          News
        </TabLink>
      </div>

      <div className="fade-in-150">
        {active === 'overview' && (
          <Suspense fallback={<SkeletonBlock lines={10} />}>
            <AllMarketsSummary />
          </Suspense>
        )}
        {active === 'fundamentals' && (
          <Suspense fallback={<SkeletonBlock lines={10} />}>
            <FundamentalsTabEntry />
          </Suspense>
        )}
        {active === 'financials' && (
          <Suspense fallback={<SkeletonBlock lines={10} />}>
            <FinancialsTabEntry />
          </Suspense>
        )}
        {active === 'news' && (
          <Suspense fallback={<SkeletonBlock lines={10} />}>
            <News />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function TabLink({
  to,
  children,
  active,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-[rgba(255,215,0,0.12)] text-amber-300'
          : 'text-zinc-300 hover:bg-[rgba(255,255,255,0.06)]'
      }`}
    >
      {children}
    </NavLink>
  );
}
