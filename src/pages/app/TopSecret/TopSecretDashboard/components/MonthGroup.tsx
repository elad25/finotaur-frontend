// =====================================================
// TopSecretDashboard - MonthGroup Component
// 🔥 OPTIMIZED: memo, lazy expansion
// =====================================================

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import { formatMonthLabel, REPORT_TYPE_CONFIG, type Report, type UserReportInteractions } from '../utils/helpers';
import { ArchiveReportRow } from './ArchiveReportRow';

interface MonthGroupProps {
  monthKey: string;
  reports: Report[];
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (report: Report) => void;
  downloadingReportId: string | null;
  userInteractions: UserReportInteractions;
  onToggleLike: (reportId: string) => void;
  onToggleBookmark: (reportId: string) => void;
  isTester?: boolean;
  onPromoteToLive?: (report: Report) => void;
  promotingReportId?: string | null;
}

export const MonthGroup = memo(function MonthGroup({
  monthKey,
  reports,
  isExpanded,
  onToggle,
  onDownload,
  downloadingReportId,
  userInteractions,
  onToggleLike,
  onToggleBookmark,
  isTester,
  onPromoteToLive,
  promotingReportId,
}: MonthGroupProps) {
  const reportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const pdfCount = useMemo(() => {
    return reports.filter(r => r.pdfStoragePath || r.pdfUrl).length;
  }, [reports]);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 
            border border-amber-500/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-white">
              {formatMonthLabel(monthKey)}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{reports.length} reports</span>
              <span>•</span>
              <span className="text-emerald-500">{pdfCount} PDFs ready</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Type badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            {Object.entries(reportCounts).map(([type, count]) => {
              const config = REPORT_TYPE_CONFIG[type as keyof typeof REPORT_TYPE_CONFIG];
              if (!config) return null;
              return (
                <span
                  key={type}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.textColor} bg-white/5`}
                >
                  {count} {config.shortName}
                </span>
              );
            })}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-black/20">
              {reports.map((report) => (
                <ArchiveReportRow
                  key={report.id}
                  report={report}
                  onDownload={onDownload}
                  isDownloading={downloadingReportId === report.id}
                  isLiked={userInteractions.likedReportIds.has(report.id)}
                  isBookmarked={userInteractions.bookmarkedReportIds.has(report.id)}
                  onToggleLike={onToggleLike}
                  onToggleBookmark={onToggleBookmark}
                  isTester={isTester}
                  onPromoteToLive={onPromoteToLive}
                  isPromoting={promotingReportId === report.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
