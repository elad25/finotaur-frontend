// src/pages/app/ai/copilot/hooks/useBenchmarkSeries.ts
// =====================================================
// React-Query hook for S&P 500 / NASDAQ benchmark series.
// Feeds the MarketComparisonChart normalised % return chart.
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { fetchBenchmarks } from '@/services/benchmarks.api';
import type { BenchPoint } from '@/services/benchmarks.api';
import type { TimeRange } from './usePortfolioData';

export type { BenchPoint };

export interface UseBenchmarkSeriesResult {
  sp500: BenchPoint[];
  nasdaq: BenchPoint[];
  isLoading: boolean;
}

export function useBenchmarkSeries(range: TimeRange): UseBenchmarkSeriesResult {
  const { data, isLoading } = useQuery({
    queryKey: ['benchmarks', range],
    queryFn: () => fetchBenchmarks(range),
    staleTime: 5 * 60 * 1000,   // 5 min
    gcTime: 30 * 60 * 1000,     // 30 min
    retry: 1,
    enabled: true,
  });

  return {
    sp500: data?.sp500 ?? [],
    nasdaq: data?.nasdaq ?? [],
    isLoading,
  };
}
