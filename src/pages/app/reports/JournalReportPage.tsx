// src/pages/app/reports/JournalReportPage.tsx
// =====================================================
// FINO REPORTS — Journal Report (/app/reports/journal)
// =====================================================
// 6-slide deep-dive on the user's own trading: consistency dashboard, FINO
// Edge Score, day-of-week performance, detected patterns, risk/drawdown,
// and discipline. Slide 1 is free for everyone; slides 2-6 require journal
// access (hasJournalAccess). All numbers are computed client-side from
// useTrades() — the AI takeaway sentence on each slide is a pure bonus
// layer that degrades to deterministic copy if the server call fails.
// =====================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrades } from '@/hooks/useTradesData';
import { useSubscription } from '@/hooks/useSubscription';
import { PageLoader } from '@/components/ds/Spinner';
import { ReportShell, ReportSlideFrame, LockedSlideOverlay } from '@/components/reports/ReportShell';
import { KeyTakeaway } from '@/components/reports/KeyTakeaway';
import { TradeCountGate } from '@/components/reports/TradeCountGate';
import {
  JOURNAL_REPORT_SLIDES,
  JOURNAL_REPORT_MIN_TRADES,
  buildJournalReportData,
  buildJournalTakeawayInputs,
  buildJournalFallbackText,
} from '@/lib/reports/journalReportData';
import { fetchTakeaways } from '@/lib/reports/reportApi';
import {
  JOURNAL_SLIDE_PILLS,
  ConsistencySlideContent,
  EdgeScoreSlideContent,
  DayOfWeekSlideContent,
  PatternsSlideContent,
  RiskDrawdownSlideContent,
  DisciplineSlideContent,
} from '@/components/reports/journal/JournalReportSlides';
import type { JournalReportData } from '@/lib/reports/reportTypes';

function slideBody(key: string, data: JournalReportData): ReactNode {
  switch (key) {
    case 'consistency':
      return <ConsistencySlideContent data={data} />;
    case 'edge-score':
      return <EdgeScoreSlideContent data={data} />;
    case 'day-of-week':
      return <DayOfWeekSlideContent data={data} />;
    case 'patterns':
      return <PatternsSlideContent data={data} />;
    case 'risk-drawdown':
      return <RiskDrawdownSlideContent data={data} />;
    case 'discipline':
      return <DisciplineSlideContent data={data} />;
    default:
      return null;
  }
}

export default function JournalReportPage() {
  const navigate = useNavigate();
  const { data: trades, isLoading } = useTrades();
  const { hasJournalAccess } = useSubscription();

  const tradesList = useMemo(() => trades ?? [], [trades]);
  const reportData = useMemo(() => buildJournalReportData(tradesList), [tradesList]);
  const fallbackText = useMemo(() => buildJournalFallbackText(reportData), [reportData]);

  const unlockedKeys = hasJournalAccess ? JOURNAL_REPORT_SLIDES.map((s) => s.key) : ['consistency'];
  const lockedKeys = useMemo(
    () => JOURNAL_REPORT_SLIDES.filter((s) => !unlockedKeys.includes(s.key)).map((s) => s.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasJournalAccess],
  );
  const subtitle =
    reportData.totalTrades > 0
      ? `${reportData.totalTrades} trades • ${reportData.dateRangeLabel} (${reportData.dateRangeDays} day${reportData.dateRangeDays === 1 ? '' : 's'})`
      : undefined;

  const [takeaways, setTakeaways] = useState<Record<string, string>>({});
  const [takeawaysLoading, setTakeawaysLoading] = useState(hasJournalAccess);

  useEffect(() => {
    if (tradesList.length < JOURNAL_REPORT_MIN_TRADES) return;
    if (!hasJournalAccess) {
      setTakeawaysLoading(false);
      return;
    }
    let cancelled = false;
    setTakeawaysLoading(true);
    const slidesInput = buildJournalTakeawayInputs(reportData, unlockedKeys);
    fetchTakeaways({
      reportType: 'journal',
      periodKey: `${reportData.totalTrades}:${reportData.dateRangeLabel}`,
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
  }, [reportData.totalTrades, reportData.dateRangeLabel, hasJournalAccess, tradesList.length]);

  if (isLoading) {
    return <PageLoader text="Building your report..." />;
  }

  if (tradesList.length < JOURNAL_REPORT_MIN_TRADES) {
    return (
      <TradeCountGate
        required={JOURNAL_REPORT_MIN_TRADES}
        current={tradesList.length}
        title="Journal Report"
        subtitle="Log at least 5 trades to generate your report"
        ctaLabel="Log a Trade"
        ctaTo="/app/journal/new"
      />
    );
  }

  const children = JOURNAL_REPORT_SLIDES.map((slide) => {
    const locked = !unlockedKeys.includes(slide.key);
    return (
      <ReportSlideFrame
        key={slide.key}
        pill={JOURNAL_SLIDE_PILLS[slide.key]}
        title={slide.title}
        locked={locked}
        lockedOverlay={
          locked ? (
            <LockedSlideOverlay
              title="Unlock the full report"
              copy="Unlock the full report with Trader."
              ctaLabel="Upgrade to Trader"
              onUpgrade={() => navigate('/app/upgrade')}
            />
          ) : undefined
        }
        takeaway={
          !locked ? (
            <KeyTakeaway
              text={takeaways[slide.key]}
              loading={takeawaysLoading}
              fallback={fallbackText[slide.key] ?? ''}
            />
          ) : undefined
        }
      >
        {slideBody(slide.key, reportData)}
      </ReportSlideFrame>
    );
  });

  return (
    <ReportShell
      slides={JOURNAL_REPORT_SLIDES}
      title="What your trading data reveals"
      subtitle={subtitle}
      lockedKeys={lockedKeys}
    >
      {children}
    </ReportShell>
  );
}
