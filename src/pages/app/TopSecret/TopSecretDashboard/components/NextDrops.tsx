// =====================================================
// NextDrops — Live Intel Rail block
// Shows countdown to the next Daily Briefing and Weekly Review.
// =====================================================

import React, { memo } from 'react';
import { Bell, FileText, Calendar } from 'lucide-react';
import { useWarZoneData } from '@/hooks/useWarZoneData';

// ─── component ────────────────────────────────────────────────────────────

export const NextDrops = memo(function NextDrops() {
  const {
    currentDailyReport,
    currentWeeklyReport,
    dailyCountdown,
    weeklyCountdown,
    isLoading,
    downloadReport,
  } = useWarZoneData();

  const formatCountdown = (hours: number, minutes: number): string => {
    if (hours == null || minutes == null) return '—';
    return `${hours}h ${minutes}m`;
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 shrink-0" style={{ color: '#C9A646' }} />
        <span className="text-sm font-semibold text-white">Next Drops</span>
      </div>

      <div className="space-y-3">
        {/* Daily Briefing row */}
        {currentDailyReport && !isLoading ? (
          <button
            onClick={() => downloadReport(currentDailyReport, 'daily')}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:opacity-80 text-left"
            style={{
              background: 'rgba(201,166,70,0.08)',
              border: '1px solid rgba(201,166,70,0.18)',
            }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,166,70,0.14)' }}
            >
              <FileText className="w-3.5 h-3.5" style={{ color: '#C9A646' }} />
            </span>
            <span className="flex-1 text-xs font-medium text-white leading-snug">
              Daily Briefing
            </span>
            <span className="text-[10px] font-semibold shrink-0" style={{ color: '#C9A646' }}>
              LIVE
            </span>
          </button>
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,166,70,0.08)' }}
            >
              <FileText className="w-3.5 h-3.5" style={{ color: '#C9A646' }} />
            </span>
            <span className="flex-1 text-xs font-medium text-gray-400 leading-snug">
              Daily Briefing
            </span>
            <span
              className="text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {isLoading ? '—' : formatCountdown(dailyCountdown?.hours, dailyCountdown?.minutes)}
            </span>
          </div>
        )}

        {/* Weekly Review row */}
        {currentWeeklyReport && !isLoading ? (
          <button
            onClick={() => downloadReport(currentWeeklyReport, 'weekly')}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:opacity-80 text-left"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.18)',
            }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.14)' }}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            </span>
            <span className="flex-1 text-xs font-medium text-white leading-snug">
              Weekly Review
            </span>
            <span className="text-[10px] font-semibold shrink-0" style={{ color: '#10b981' }}>
              LIVE
            </span>
          </button>
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.08)' }}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            </span>
            <span className="flex-1 text-xs font-medium text-gray-400 leading-snug">
              Weekly Review
            </span>
            <span
              className="text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {isLoading ? '—' : formatCountdown(weeklyCountdown?.hours, weeklyCountdown?.minutes)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
