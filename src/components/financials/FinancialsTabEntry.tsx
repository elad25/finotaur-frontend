import { lazy, Suspense } from 'react';
import { useFundamentals } from '@/hooks/useFundamentals';
import { useSymbol } from '@/hooks/useSymbol';
import SkeletonBlock from '@/components/fundamentals/SkeletonBlock';

const StatementsCompact = lazy(() => import('@/components/fundamentals/StatementsCompact'));
const RatiosTable = lazy(() => import('@/components/fundamentals/RatiosTable'));

export default function FinancialsTabEntry() {
  const symbol = useSymbol();
  const { data, isLoading, error } = useFundamentals(symbol);

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
        Failed to load financials: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in-150">
      <div className="text-xl font-semibold text-white">Financials <span className="text-zinc-400">· {symbol}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<SkeletonBlock lines={10} />}>
          <StatementsCompact data={data} isLoading={isLoading} />
        </Suspense>
        <Suspense fallback={<SkeletonBlock lines={10} />}>
          <RatiosTable data={data} isLoading={isLoading} />
        </Suspense>
      </div>
    </div>
  );
}
