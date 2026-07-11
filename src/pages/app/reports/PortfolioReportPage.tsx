// src/pages/app/reports/PortfolioReportPage.tsx
// =====================================================
// FINO REPORTS — Portfolio Report (/app/reports/portfolio)
// =====================================================
// 4-slide portfolio-composition report: allocation, long vs short exposure,
// concentration risk, and per-symbol edge. Gated behind 60 logged trades
// (usePortfolioStats().stats.tradeCount) — below that the sample is too
// thin to say anything meaningful about allocation or symbol edge.
// =====================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePortfolioStats } from '@/hooks/usePortfolioStats';
import { useTrades } from '@/hooks/useTradesData';
import { PageLoader } from '@/components/ds/Spinner';
import { ReportShell, ReportSlideFrame } from '@/components/reports/ReportShell';
import { KeyTakeaway } from '@/components/reports/KeyTakeaway';
import { TradeCountGate } from '@/components/reports/TradeCountGate';
import {
  PORTFOLIO_REPORT_SLIDES,
  PORTFOLIO_REPORT_MIN_TRADES,
  buildPortfolioReportData,
  buildPortfolioTakeawayInputs,
  buildPortfolioFallbackText,
} from '@/lib/reports/portfolioReportData';
import { fetchTakeaways } from '@/lib/reports/reportApi';
import {
  PORTFOLIO_SLIDE_PILLS,
  AllocationSlideContent,
  LongShortSlideContent,
  ConcentrationSlideContent,
  SymbolEdgeSlideContent,
} from '@/components/reports/portfolio/PortfolioReportSlides';
import type { PortfolioReportData } from '@/lib/reports/reportTypes';

function slideBody(key: string, data: PortfolioReportData): ReactNode {
  switch (key) {
    case 'allocation':
      return <AllocationSlideContent data={data} />;
    case 'long-short':
      return <LongShortSlideContent data={data} />;
    case 'concentration':
      return <ConcentrationSlideContent data={data} />;
    case 'symbol-edge':
      return <SymbolEdgeSlideContent data={data} />;
    default:
      return null;
  }
}

export default function PortfolioReportPage() {
  const { stats, loading: statsLoading } = usePortfolioStats();
  const tradeCount = stats?.tradeCount ?? 0;
  const unlocked = tradeCount >= PORTFOLIO_REPORT_MIN_TRADES;

  // Only fetch the full trades list once the gate is actually open — no
  // reason to pull every trade just to show a locked progress bar.
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const tradesList = useMemo(() => (unlocked ? trades ?? [] : []), [unlocked, trades]);

  const reportData = useMemo(() => buildPortfolioReportData(tradesList), [tradesList]);
  const fallbackText = useMemo(() => buildPortfolioFallbackText(reportData), [reportData]);

  const [takeaways, setTakeaways] = useState<Record<string, string>>({});
  const [takeawaysLoading, setTakeawaysLoading] = useState(unlocked);

  useEffect(() => {
    if (!unlocked || tradesList.length === 0) return;
    let cancelled = false;
    setTakeawaysLoading(true);
    const slidesInput = buildPortfolioTakeawayInputs(reportData);
    fetchTakeaways({
      reportType: 'portfolio',
      // b1 = bullet-format takeaways (2026-07-11) — bumping invalidates same-period cached prose.
      periodKey: `b1:${tradesList.length}`,
      slides: slidesInput,
    })
      .then((res) => {
        if (!cancelled) setTakeaways(res?.takeaways ?? {});
      })
      .finally(() => {
        if (!cancelled) setTakeawaysLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, tradesList.length]);

  if (statsLoading) {
    return <PageLoader text="Loading your portfolio..." />;
  }

  if (!unlocked) {
    return (
      <TradeCountGate
        required={PORTFOLIO_REPORT_MIN_TRADES}
        current={tradeCount}
        title="Portfolio Report"
        subtitle={`Unlocks at ${PORTFOLIO_REPORT_MIN_TRADES} logged trades`}
        ctaLabel="Go to Journal"
        ctaTo="/app/journal"
      />
    );
  }

  if (tradesLoading) {
    return <PageLoader text="Building your report..." />;
  }

  const children = PORTFOLIO_REPORT_SLIDES.map((slide) => (
    <ReportSlideFrame
      key={slide.key}
      pill={PORTFOLIO_SLIDE_PILLS[slide.key]}
      title={slide.title}
      takeaway={
        <KeyTakeaway
          text={takeaways[slide.key]}
          loading={takeawaysLoading}
          fallback={fallbackText[slide.key] ?? ''}
        />
      }
    >
      {slideBody(slide.key, reportData)}
    </ReportSlideFrame>
  ));

  return <ReportShell slides={PORTFOLIO_REPORT_SLIDES}>{children}</ReportShell>;
}
