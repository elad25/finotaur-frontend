// =====================================================
// CadenceIntel — Always-visible hero cadence cards
// surfaces TODAY'S BRIEFING (gold) and THIS WEEK (emerald)
// at the top of the Top Secret dashboard.
// =====================================================

import React, { memo } from 'react';
import { FileText, Calendar, Clock, Download, Loader2 } from 'lucide-react';
import { useWarZoneData } from '@/hooks/useWarZoneData';

// -------------------------------------------------------
// Helper — format report published time (America/New_York)
// -------------------------------------------------------

const formatReportTime = (createdAt: string): string =>
  new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });

const formatPrevDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

// -------------------------------------------------------
// Theme definitions
// -------------------------------------------------------

interface CardTheme {
  accentBar: string;
  border: string;
  bg: string;
  eyebrowColor: string;
  eyebrowText: string;
  primaryGradient: string;
  primaryOutlineBorder: string;
  primaryOutlineText: string;
  livePillBg: string;
  livePillText: string;
}

const DAILY_THEME: CardTheme = {
  accentBar: 'linear-gradient(180deg,#E8C766,#C9A646 55%,#A88838)',
  border: 'rgba(201,166,70,0.35)',
  bg: '#121008',
  eyebrowColor: '#C9A646',
  eyebrowText: '★ TODAY\'S BRIEFING',
  primaryGradient: 'linear-gradient(135deg,#E8C766,#C9A646 55%,#A88838)',
  primaryOutlineBorder: 'rgba(201,166,70,0.5)',
  primaryOutlineText: '#C9A646',
  livePillBg: 'rgba(34,197,94,0.15)',
  livePillText: '#22c55e',
};

const WEEKLY_THEME: CardTheme = {
  accentBar: 'linear-gradient(180deg,#34d399,#0d9488)',
  border: 'rgba(16,185,129,0.35)',
  bg: '#081210',
  eyebrowColor: '#10b981',
  eyebrowText: '◆ THIS WEEK',
  primaryGradient: 'linear-gradient(135deg,#34d399,#10b981 55%,#0d9488)',
  primaryOutlineBorder: 'rgba(16,185,129,0.5)',
  primaryOutlineText: '#10b981',
  livePillBg: 'rgba(16,185,129,0.15)',
  livePillText: '#10b981',
};

// -------------------------------------------------------
// Individual hero card
// -------------------------------------------------------

interface HeroCardProps {
  theme: CardTheme;
  icon: React.ReactNode;
  title: string;
  metaLine: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  onPdf: () => void;
  disabled: boolean;
  isLoading: boolean;
  hasReport: boolean;
  countdownHours: number;
  countdownMinutes: number;
  comingSoonText: string;
  prevDateStr: string | null;
  onPrevDownload: (() => void) | null;
}

const HeroCard = memo(function HeroCard({
  theme,
  icon,
  title,
  metaLine,
  primaryLabel,
  onPrimary,
  onPdf,
  disabled,
  isLoading,
  hasReport,
  countdownHours,
  countdownMinutes,
  comingSoonText,
  prevDateStr,
  onPrevDownload,
}: HeroCardProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: theme.accentBar }}
      />

      <div className="pl-5 pr-5 pt-5 pb-4 flex flex-col gap-3 flex-1">
        {/* Eyebrow row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-medium tracking-widest uppercase"
              style={{ color: theme.eyebrowColor, fontSize: 11, letterSpacing: '0.12em' }}
            >
              {theme.eyebrowText}
            </span>
            {hasReport && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: theme.livePillBg, color: theme.livePillText }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                LIVE
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Clock className="w-3 h-3" />
            Next in {countdownHours}h {countdownMinutes}m
          </span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `rgba(${theme.eyebrowColor === '#C9A646' ? '201,166,70' : '16,185,129'},0.12)`, border: `1px solid ${theme.border}` }}
          >
            {isLoading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" style={{ color: theme.eyebrowColor }} />
            ) : (
              <span style={{ color: theme.eyebrowColor }}>{icon}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium leading-snug" style={{ fontSize: 19 }}>
              {title}
            </h3>
            {metaLine && (
              <p className="mt-0.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                {metaLine}
              </p>
            )}
          </div>
        </div>

        {/* Coming-soon state */}
        {!isLoading && !hasReport && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Clock className="w-4 h-4 shrink-0" style={{ color: theme.eyebrowColor, opacity: 0.6 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{comingSoonText}</span>
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <button
            onClick={onPrimary}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: disabled ? 'rgba(255,255,255,0.08)' : theme.primaryGradient,
              color: disabled ? 'rgba(255,255,255,0.4)' : '#000',
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {primaryLabel}
          </button>

          <button
            onClick={onPdf}
            disabled={disabled}
            title="Download PDF"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            style={{
              border: `1px solid ${theme.primaryOutlineBorder}`,
              color: theme.primaryOutlineText,
              background: 'transparent',
            }}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Previous report link */}
        {prevDateStr && onPrevDownload && (
          <button
            onClick={onPrevDownload}
            className="text-left transition-opacity hover:opacity-80"
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}
          >
            Previous: {prevDateStr}
          </button>
        )}
      </div>
    </div>
  );
});

// -------------------------------------------------------
// Main exported component
// -------------------------------------------------------

export const CadenceIntel = memo(function CadenceIntel() {
  const {
    currentDailyReport,
    previousDailyReport,
    currentWeeklyReport,
    previousWeeklyReport,
    isInTrial,
    trialDaysRemaining,
    isLoading,
    dailyCountdown,
    weeklyCountdown,
    downloadReport,
  } = useWarZoneData();

  const hasDailyReport = !!currentDailyReport;
  const hasWeeklyReport = !!currentWeeklyReport;

  const dailyTitle = currentDailyReport?.report_title || "Today's Market Briefing";
  const weeklyTitle = currentWeeklyReport?.report_title || 'Weekly Tactical Review';

  const dailyMeta = currentDailyReport
    ? `Published ${formatReportTime(currentDailyReport.created_at)} ET${currentDailyReport.qa_score ? ` · QA ${currentDailyReport.qa_score}` : ''}`
    : null;

  const weeklyMeta = currentWeeklyReport
    ? `Published ${formatReportTime(currentWeeklyReport.created_at)} ET${currentWeeklyReport.qa_score ? ` · QA ${currentWeeklyReport.qa_score}` : ''}`
    : null;

  const prevDailyDate = previousDailyReport ? formatPrevDate(previousDailyReport.report_date) : null;
  const prevWeeklyDate = previousWeeklyReport ? formatPrevDate(previousWeeklyReport.report_date) : null;

  return (
    <div className="space-y-4">
      {/* Trial banner */}
      {isInTrial && trialDaysRemaining !== null && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(201,166,70,0.10)',
            border: '1px solid rgba(201,166,70,0.25)',
          }}
        >
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-400 font-medium">
            Free trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* 2-column hero grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily — gold */}
        <HeroCard
          theme={DAILY_THEME}
          icon={<FileText className="w-4.5 h-4.5" />}
          title={dailyTitle}
          metaLine={dailyMeta}
          primaryLabel="Read briefing"
          onPrimary={() => { if (currentDailyReport) downloadReport(currentDailyReport, 'daily'); }}
          onPdf={() => { if (currentDailyReport) downloadReport(currentDailyReport, 'daily'); }}
          disabled={!hasDailyReport || isLoading}
          isLoading={isLoading}
          hasReport={hasDailyReport}
          countdownHours={dailyCountdown.hours}
          countdownMinutes={dailyCountdown.minutes}
          comingSoonText="Today's briefing — coming soon"
          prevDateStr={prevDailyDate}
          onPrevDownload={previousDailyReport ? () => downloadReport(previousDailyReport, 'daily') : null}
        />

        {/* Weekly — emerald */}
        <HeroCard
          theme={WEEKLY_THEME}
          icon={<Calendar className="w-4.5 h-4.5" />}
          title={weeklyTitle}
          metaLine={weeklyMeta}
          primaryLabel="Read weekly"
          onPrimary={() => { if (currentWeeklyReport) downloadReport(currentWeeklyReport, 'weekly'); }}
          onPdf={() => { if (currentWeeklyReport) downloadReport(currentWeeklyReport, 'weekly'); }}
          disabled={!hasWeeklyReport || isLoading}
          isLoading={isLoading}
          hasReport={hasWeeklyReport}
          countdownHours={weeklyCountdown.hours}
          countdownMinutes={weeklyCountdown.minutes}
          comingSoonText="Weekly review — coming soon"
          prevDateStr={prevWeeklyDate}
          onPrevDownload={previousWeeklyReport ? () => downloadReport(previousWeeklyReport, 'weekly') : null}
        />
      </div>
    </div>
  );
});
