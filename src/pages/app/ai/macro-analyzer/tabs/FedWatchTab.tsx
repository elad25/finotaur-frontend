// tabs/FedWatchTab.tsx
// =====================================================
// 🏛️ FED WATCH TAB v2.0
// Premium compact design, FOMC Minutes Intelligence
// Rate path, balance sheet, yield curve analysis
// Fed meetings timeline, AI interpretation
// All from /api/fed endpoint (real FRED data)
// FOMC Minutes from /api/fed/fomc-minutes (AI cached)
// =====================================================

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Banknote, Brain, Calendar, TrendingUp, TrendingDown,
  RefreshCw, AlertTriangle, Activity, Shield, BarChart2,
  ArrowRight, Clock, Target, FileText, ChevronDown,
  ChevronUp, Zap, Eye, Scale, MessageSquare
} from 'lucide-react';
import {
  Card, SectionHeader, Badge, ProgressBar, LazySection,
  cn, SectionSkeleton
} from '../shared/ui';
import { useFedData, useFOMCMinutes, type FedData, type AIResult } from '../shared/api';

// =====================================================
// HERO: RATE + YIELDS COMPACT STRIP
// Shows Fed Funds, 10Y, 2Y, Yield Curve in one tight row
// =====================================================

const RateHeroStrip = memo(({ fedData }: { fedData: FedData }) => {
  const yieldCurvePositive = fedData.yieldCurve > 0;
  const yieldCurveSignal = useMemo(() => {
    if (fedData.yieldCurve > 0.5) return { label: 'Steep Positive', color: '#22C55E', emoji: '🟢', desc: 'Expansion signal — banks lending profitably' };
    if (fedData.yieldCurve > 0) return { label: 'Slightly Positive', color: '#22C55E', emoji: '🟡', desc: 'Normalizing — recovery phase' };
    if (fedData.yieldCurve > -0.5) return { label: 'Flat/Inverted', color: '#F59E0B', emoji: '🟠', desc: 'Caution — slowdown possible' };
    return { label: 'Deeply Inverted', color: '#EF4444', emoji: '🔴', desc: 'Recession warning — historically precedes downturns 12-18m' };
  }, [fedData.yieldCurve]);

  return (
    <Card highlight>
      <div className="p-5">
        {/* Top row: Fed Funds prominent + yields compact */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}>
              <Banknote className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Federal Funds Rate</h3>
              <p className="text-[10px] text-[#6B6B6B]">Current target rate</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold text-[#C9A646] tracking-tight">{fedData.currentRate}%</span>
          </div>
        </div>

        {/* Rate bar — slim */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(fedData.currentRate / 6) * 100}%`, background: 'linear-gradient(90deg, #C9A646, #F4D97B)' }}
          />
        </div>

        {/* Yields + Curve in tight grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">10Y</p>
            <p className="text-lg font-bold text-white mt-0.5">{fedData.treasury10y}%</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">2Y</p>
            <p className="text-lg font-bold text-white mt-0.5">{fedData.treasury2y}%</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">3M</p>
            <p className="text-lg font-bold text-white mt-0.5">{fedData.treasury3m}%</p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{
            background: yieldCurvePositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${yieldCurvePositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`
          }}>
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">Curve</p>
            <p className={cn("text-lg font-bold mt-0.5", yieldCurvePositive ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {fedData.yieldCurve > 0 ? '+' : ''}{fedData.yieldCurve.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Yield curve interpretation — single line */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
          <span className="text-xs">{yieldCurveSignal.emoji}</span>
          <p className="text-[11px] text-[#8B8B8B]">
            <span className="font-semibold" style={{ color: yieldCurveSignal.color }}>{yieldCurveSignal.label}</span>
            <span className="mx-1.5 text-[#3B3B3B]">—</span>
            {yieldCurveSignal.desc}
          </p>
        </div>
      </div>
    </Card>
  );
});
RateHeroStrip.displayName = 'RateHeroStrip';

// =====================================================
// AI FED INTERPRETATION — Compact
// =====================================================

const AIFedInterpretation = memo(({ fedData }: { fedData: FedData }) => {
  const interpretation = useMemo(() => {
    const { currentRate, yieldCurve, treasury10y, treasury2y, meetings } = fedData;
    const nextCut = meetings?.find((m: any) => m.decision === 'cut');
    const cutsCount = meetings?.filter((m: any) => m.decision === 'cut').length || 0;

    let stance = 'NEUTRAL';
    let stanceColor = '#F59E0B';
    if (currentRate > 4.5 && yieldCurve < 0) {
      stance = 'RESTRICTIVE';
      stanceColor = '#EF4444';
    } else if (currentRate > 4) {
      stance = 'MODERATELY RESTRICTIVE';
      stanceColor = '#F59E0B';
    } else if (currentRate < 3) {
      stance = 'ACCOMMODATIVE';
      stanceColor = '#22C55E';
    }

    const conditions: string[] = [];
    if (yieldCurve < 0) conditions.push('Inverted yield curve signals tightening financial conditions');
    if (yieldCurve > 0) conditions.push('Positive yield curve supports economic expansion');
    if (treasury10y > 4.5) conditions.push('Elevated long-term rates pressuring housing & investment');
    if (treasury10y < 4) conditions.push('Long-term rates moderating, supportive for growth');

    return { stance, stanceColor, cutsCount, nextCut, conditions,
      riskScenario: currentRate > 4.5
        ? 'If inflation re-accelerates, cuts could be delayed. Watch Core PCE & wage growth.'
        : 'If economic data weakens significantly, the Fed may cut faster than currently priced.',
    };
  }, [fedData]);

  return (
    <Card highlight>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}>
              <Brain className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI Fed Interpretation</h3>
              <p className="text-[10px] text-[#6B6B6B]">What the data means for markets</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg" style={{ background: `${interpretation.stanceColor}15`, border: `1px solid ${interpretation.stanceColor}30` }}>
            <span className="text-sm font-bold" style={{ color: interpretation.stanceColor }}>
              {interpretation.stance}
            </span>
          </div>
        </div>

        {/* Compact analysis block */}
        <div className="p-4 rounded-xl mb-3" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.15)' }}>
          <p className="text-sm text-[#E8DCC4] leading-relaxed">
            Fed Funds at <span className="text-[#C9A646] font-semibold">{fedData.currentRate}%</span>.
            {interpretation.cutsCount > 0 && (
              <> Markets pricing <span className="text-[#22C55E] font-semibold">{interpretation.cutsCount} cuts</span> ahead.</>
            )}
            {interpretation.nextCut && (
              <> First cut expected <span className="text-[#22C55E] font-semibold">
                {new Date(interpretation.nextCut.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span> ({interpretation.nextCut.probability}% prob).</>
            )}
          </p>

          {interpretation.conditions.length > 0 && (
            <div className="mt-3 space-y-1">
              {interpretation.conditions.map((cond, idx) => (
                <p key={idx} className="text-xs text-[#8B8B8B] flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#C9A646] flex-shrink-0" />
                  {cond}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Risk — compact */}
        <div className="px-3 py-2.5 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/15 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#8B8B8B] leading-relaxed">{interpretation.riskScenario}</p>
        </div>
      </div>
    </Card>
  );
});
AIFedInterpretation.displayName = 'AIFedInterpretation';

// =====================================================
// RATE PATH — Compact table style
// =====================================================

const RatePath = memo(({ meetings }: { meetings: FedData['meetings'] }) => {
  if (!meetings || meetings.length === 0) return null;
  const [showAll, setShowAll] = useState(false);

  const cutsExpected = useMemo(() =>
    meetings.filter((m: any) => m.decision === 'cut').length,
    [meetings]
  );

  const visibleMeetings = showAll ? meetings : meetings.slice(0, 6);

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}>
              <TrendingDown className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Rate Path</h3>
              <p className="text-[10px] text-[#6B6B6B]">Fed Funds Futures</p>
            </div>
          </div>
          <Badge variant={cutsExpected > 0 ? 'success' : 'warning'}>
            {cutsExpected} CUTS PRICED
          </Badge>
        </div>

        {/* Compact meeting rows */}
        <div className="space-y-1.5">
          {visibleMeetings.map((meeting: any, idx: number) => {
            const color = meeting.decision === 'cut' ? '#22C55E' : meeting.decision === 'hike' ? '#EF4444' : '#F59E0B';
            return (
              <div
                key={idx}
                className={cn("flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                  meeting.isNext ? "" : "bg-white/[0.02] hover:bg-white/[0.04]"
                )}
                style={meeting.isNext ? { background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.2)' } : {}}
              >
                <div className="flex items-center gap-2.5">
                  {meeting.isNext && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#C9A646]/15 text-[#C9A646]">NEXT</span>
                  )}
                  <span className="text-sm text-white font-medium">
                    {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-[#6B6B6B]">{meeting.expectedRate}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color }}>{meeting.decision.toUpperCase()}</span>
                  <div className="w-16">
                    <ProgressBar value={meeting.probability} color={color} />
                  </div>
                  <span className="text-[10px] text-[#6B6B6B] w-8 text-right">{meeting.probability}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {meetings.length > 6 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 text-xs text-[#C9A646] hover:text-[#F4D97B] transition-colors"
          >
            {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {meetings.length} meetings</>}
          </button>
        )}

        {/* Terminal rate */}
        {meetings.length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.02] flex items-center justify-between">
            <span className="text-[10px] text-[#6B6B6B]">Terminal Rate</span>
            <span className="text-sm text-white font-medium">
              {meetings[meetings.length - 1].expectedRate}% by {new Date(meetings[meetings.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
});
RatePath.displayName = 'RatePath';

// =====================================================
// BALANCE SHEET — Compact
// =====================================================

const BalanceSheet = memo(({ balanceSheet }: { balanceSheet: FedData['balanceSheet'] }) => {
  if (!balanceSheet) return null;

  const fmt = (val: number) => {
    if (val > 1e6) return `$${(val / 1e6).toFixed(2)}T`;
    if (val > 1e3) return `$${(val / 1e3).toFixed(0)}B`;
    return `$${val.toFixed(0)}M`;
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}>
              <BarChart2 className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Balance Sheet</h3>
              <p className="text-[10px] text-[#6B6B6B]">QT status</p>
            </div>
          </div>
          <span className={cn("text-sm font-bold",
            balanceSheet.changePercent < 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
          )}>
            {balanceSheet.changePercent > 0 ? '+' : ''}{balanceSheet.changePercent.toFixed(2)}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-[#C9A646] mt-1">{fmt(balanceSheet.totalAssets)}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">Treasuries</p>
            <p className="text-xl font-bold text-white mt-1">{fmt(balanceSheet.treasuries)}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">MBS</p>
            <p className="text-xl font-bold text-white mt-1">{fmt(balanceSheet.mbs)}</p>
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg bg-white/[0.02]">
          <p className="text-[11px] text-[#6B6B6B]">
            {balanceSheet.changePercent < 0
              ? '📉 QT in progress — shrinking balance sheet, reducing liquidity'
              : '📈 Expanding — providing additional liquidity to markets'}
          </p>
        </div>
      </div>
    </Card>
  );
});
BalanceSheet.displayName = 'BalanceSheet';

// =====================================================
// FED CALENDAR — Compact list
// =====================================================

const FedCalendar = memo(({ events }: { events: FedData['events'] }) => {
  if (!events || events.length === 0) return null;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}>
              <Calendar className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Fed Calendar</h3>
              <p className="text-[10px] text-[#6B6B6B]">Upcoming events</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {events.map((event: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-2.5">
                <span className={cn("w-1.5 h-1.5 rounded-full",
                  event.importance === 'high' ? 'bg-[#EF4444]' : event.importance === 'medium' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                )} />
                <span className="text-xs text-white font-medium">{event.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8B8B8B]">{event.event}</span>
                <Badge variant={event.importance === 'high' ? 'danger' : event.importance === 'medium' ? 'warning' : 'success'}>
                  {event.importance.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});
FedCalendar.displayName = 'FedCalendar';

// =====================================================
// 🆕 FOMC MINUTES INTELLIGENCE
// AI analysis of latest FOMC minutes (cached 24h+)
// Single generation serves 10K users
// =====================================================

const FOMCMinutesSection = memo(() => {
  const { data: minutesData, isLoading: minutesLoading } = useFOMCMinutes();
  const [expandedSection, setExpandedSection] = useState<number>(0);

  // Parse sections using [N] SECTION TITLE format
  const sections = useMemo(() => {
    if (!minutesData?.analysis) return [];
    const text = minutesData.analysis;

    // Match [1] TITLE pattern
    const sectionRegex = /\[(\d+)\]\s*([^\n]+)/g;
    const parts: { num: string; title: string; takeaway: string; content: string }[] = [];
    const matches: { index: number; num: string; title: string }[] = [];
    let match;

    while ((match = sectionRegex.exec(text)) !== null) {
      matches.push({ index: match.index, num: match[1], title: match[2].trim() });
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].title.length + matches[i].num.length + 3;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const body = text.slice(start, end).trim();

      // Extract "Key takeaway:" line
      let takeaway = '';
      let content = body;
      const takeawayMatch = body.match(/^Key takeaway:\s*(.+?)(?:\n|$)/i);
      if (takeawayMatch) {
        takeaway = takeawayMatch[1].trim();
        content = body.slice(takeawayMatch[0].length).trim();
      }

      parts.push({
        num: matches[i].num,
        title: matches[i].title,
        takeaway,
        content,
      });
    }

    // Fallback: if no [N] sections found, try to show as single block
    if (parts.length === 0 && text.length > 0) {
      return [{ num: '1', title: 'FOMC Minutes Analysis', takeaway: '', content: text }];
    }

    return parts;
  }, [minutesData?.analysis]);

  const sectionIcons = [Scale, Shield, Activity, BarChart2, Eye, Target, TrendingUp];

  return (
    <Card highlight>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}>
              <FileText className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">FOMC Minutes Intelligence</h3>
              <p className="text-[10px] text-[#6B6B6B]">AI deep analysis of Federal Reserve meeting protocol</p>
            </div>
          </div>
          {minutesData?.generatedAt && (
            <span className="text-[9px] text-[#6B6B6B]">
              {minutesData.cached ? `Cached • ${minutesData.ageMinutes}m ago` : 'Fresh'} • {new Date(minutesData.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Loading state */}
        {minutesLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(201,166,70,0.05)' }} />
            ))}
          </div>
        ) : !minutesData?.analysis ? (
          /* Waiting for auto-generation */
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.15)' }}>
              <Clock className="w-7 h-7 text-[#C9A646]/40" />
            </div>
            <p className="text-sm text-[#8B8B8B] mb-1">FOMC Minutes analysis generating...</p>
            <p className="text-[10px] text-[#6B6B6B]">Auto-generated on first load, cached 24h for all users</p>
          </div>
        ) : (
          /* Content — clean expandable sections */
          <div className="space-y-1">
            {sections.map((section, idx) => {
              const Icon = sectionIcons[idx % sectionIcons.length];
              const isOpen = expandedSection === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg overflow-hidden transition-all duration-200"
                  style={{
                    background: isOpen ? 'rgba(201,166,70,0.04)' : 'rgba(255,255,255,0.015)',
                    border: isOpen ? '1px solid rgba(201,166,70,0.15)' : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <button
                    onClick={() => setExpandedSection(isOpen ? -1 : idx)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,166,70,0.1)' }}>
                      <Icon className="w-3.5 h-3.5 text-[#C9A646]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[#C9A646] font-bold">{section.num}</span>
                        <span className="text-xs font-semibold text-white">{section.title}</span>
                      </div>
                      {section.takeaway && !isOpen && (
                        <p className="text-[10px] text-[#8B8B8B] mt-0.5 truncate">{section.takeaway}</p>
                      )}
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-[#6B6B6B] transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-4 pt-0">
                      {section.takeaway && (
                        <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.1)' }}>
                          <p className="text-[11px] text-[#C9A646] font-medium">{section.takeaway}</p>
                        </div>
                      )}
                      <div className="pl-3 border-l-2 border-[#C9A646]/10">
                        <p className="text-[13px] text-[#B8B0A0] leading-[1.7] whitespace-pre-line">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
});
FOMCMinutesSection.displayName = 'FOMCMinutesSection';

// =====================================================
// MAIN FED WATCH TAB
// =====================================================

function FedWatchTab() {
  const { data: fedData, isLoading, error, refresh, lastUpdated } = useFedData();

  if (error) {
    return (
      <Card>
        <div className="p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-[#EF4444] mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load Fed data</p>
          <p className="text-sm text-[#8B8B8B] mb-4">{error}</p>
          <button onClick={refresh} className="px-4 py-2 rounded-lg text-sm text-[#C9A646] border border-[#C9A646]/30 hover:bg-[#C9A646]/10">
            <RefreshCw className="w-4 h-4 inline mr-2" /> Retry
          </button>
        </div>
      </Card>
    );
  }

  if (isLoading || !fedData) {
    return (
      <div className="space-y-4">
        <SectionSkeleton height="h-48" />
        <SectionSkeleton height="h-40" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionSkeleton height="h-64" />
          <SectionSkeleton height="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero: Rate + Yields strip */}
      <RateHeroStrip fedData={fedData} />

      {/* AI Interpretation — compact */}
      <AIFedInterpretation fedData={fedData} />

      {/* Rate Path + Balance Sheet side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LazySection fallbackHeight="h-72">
          <RatePath meetings={fedData.meetings} />
        </LazySection>
        <LazySection fallbackHeight="h-48">
          <BalanceSheet balanceSheet={fedData.balanceSheet} />
        </LazySection>
      </div>

      {/* 🆕 FOMC Minutes Intelligence */}
      <LazySection fallbackHeight="h-64">
        <FOMCMinutesSection />
      </LazySection>

      {/* Fed Calendar */}
      <LazySection fallbackHeight="h-48">
        <FedCalendar events={fedData.events} />
      </LazySection>

      {/* Last update */}
      {lastUpdated && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-[#6B6B6B]">
          <Clock className="w-3 h-3" />
          Fed data from FRED • Updated {new Date(lastUpdated).toLocaleTimeString()}
          <button onClick={refresh} className="text-[#C9A646] hover:text-[#F4D97B] ml-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(FedWatchTab);