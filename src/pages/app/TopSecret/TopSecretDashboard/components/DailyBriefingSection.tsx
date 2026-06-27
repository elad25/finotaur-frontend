// =====================================================
// DailyBriefingSection — War Zone daily/weekly reports
// surfaced inside the Top Secret dashboard.
//
// Reuses useWarZoneData hook and the WarzoneComponents
// ReportCard for rendering so subscribers get the same
// experience they had on the standalone War Zone page.
// =====================================================

import React, { memo, useCallback } from 'react';
import { Clock, FileText, Calendar, Loader2 } from 'lucide-react';
import { useWarZoneData, type DailyReport, type WeeklyReport } from '@/hooks/useWarZoneData';

// -------------------------------------------------------
// Helper — format report date to a human-readable string
// -------------------------------------------------------

const formatReportDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatReportTime = (createdAt: string): string =>
  new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });

// -------------------------------------------------------
// Single report download card
// -------------------------------------------------------

interface ReportRowProps {
  report: DailyReport | WeeklyReport | null;
  type: 'daily' | 'weekly';
  isLoading: boolean;
  onDownload: () => void;
}

const ReportRow = memo(function ReportRow({ report, type, isLoading, onDownload }: ReportRowProps) {
  const Icon = type === 'weekly' ? Calendar : FileText;
  const label = type === 'weekly' ? 'Weekly Review' : "Today's Daily Briefing";

  if (!isLoading && !report) {
    return (
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{
          background: 'rgba(201,166,70,0.06)',
          border: '1px solid rgba(201,166,70,0.15)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(201,166,70,0.10)', border: '1px solid rgba(201,166,70,0.2)' }}
        >
          <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <p className="text-white/60 text-sm font-medium">
            {label} — coming soon
          </p>
          <p className="text-amber-500/50 text-xs">Check back after 9:00 AM ET</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onDownload}
      disabled={isLoading || !report}
      className="group w-full text-left flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.3)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
        ) : (
          <Icon className="w-5 h-5 text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">
          {isLoading
            ? 'Loading...'
            : report
              ? type === 'weekly'
                ? `Week of ${new Date(report.report_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                : formatReportDate(report.report_date)
              : label}
        </p>
        <p className="text-amber-400/60 text-xs">
          {isLoading
            ? 'Please wait...'
            : report
              ? `Published at ${formatReportTime(report.created_at)} ET · click to download PDF`
              : 'Not yet available'}
        </p>
      </div>
    </button>
  );
});

// -------------------------------------------------------
// Previous reports row
// -------------------------------------------------------

interface PrevReportRowProps {
  report: DailyReport | WeeklyReport | null;
  type: 'daily' | 'weekly';
  isLoading: boolean;
  onDownload: () => void;
}

const PrevReportRow = memo(function PrevReportRow({ report, type, isLoading, onDownload }: PrevReportRowProps) {
  if (!report && !isLoading) return null;

  const label = type === 'weekly' ? 'Previous Weekly' : 'Previous Daily';
  const Icon = type === 'weekly' ? Calendar : FileText;

  return (
    <button
      onClick={onDownload}
      disabled={isLoading || !report}
      className="group w-full text-left flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon className="w-4 h-4 text-amber-400/70 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-white/70 text-xs font-medium">
          {label}:{' '}
          {isLoading
            ? 'Loading...'
            : report
              ? type === 'weekly'
                ? `Week of ${new Date(report.report_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                : formatReportDate(report.report_date)
              : '—'}
        </span>
      </div>
      {report && (
        <span className="text-amber-400/50 text-[10px] shrink-0">PDF ↓</span>
      )}
    </button>
  );
});

// -------------------------------------------------------
// Main exported section
// -------------------------------------------------------

export const DailyBriefingSection = memo(function DailyBriefingSection() {
  const {
    currentDailyReport,
    previousDailyReport,
    currentWeeklyReport,
    previousWeeklyReport,
    isInTrial,
    trialDaysRemaining,
    isLoading,
    downloadReport,
  } = useWarZoneData();

  const handleDailyDownload = useCallback(() => {
    if (currentDailyReport) downloadReport(currentDailyReport, 'daily');
  }, [currentDailyReport, downloadReport]);

  const handleWeeklyDownload = useCallback(() => {
    if (currentWeeklyReport) downloadReport(currentWeeklyReport, 'weekly');
  }, [currentWeeklyReport, downloadReport]);

  const handlePrevDailyDownload = useCallback(() => {
    if (previousDailyReport) downloadReport(previousDailyReport, 'daily');
  }, [previousDailyReport, downloadReport]);

  const handlePrevWeeklyDownload = useCallback(() => {
    if (previousWeeklyReport) downloadReport(previousWeeklyReport, 'weekly');
  }, [previousWeeklyReport, downloadReport]);

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

      {/* Current reports */}
      <div className="space-y-3">
        <ReportRow
          report={currentDailyReport}
          type="daily"
          isLoading={isLoading}
          onDownload={handleDailyDownload}
        />
        <ReportRow
          report={currentWeeklyReport}
          type="weekly"
          isLoading={isLoading}
          onDownload={handleWeeklyDownload}
        />
      </div>

      {/* Previous reports */}
      {(previousDailyReport || previousWeeklyReport) && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-1">
            Previous Reports
          </p>
          <PrevReportRow
            report={previousDailyReport}
            type="daily"
            isLoading={isLoading}
            onDownload={handlePrevDailyDownload}
          />
          <PrevReportRow
            report={previousWeeklyReport}
            type="weekly"
            isLoading={isLoading}
            onDownload={handlePrevWeeklyDownload}
          />
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        New report every trading day · 9:10 AM ET
      </p>
    </div>
  );
});
