// =====================================================
// TopSecretDashboard - ArchiveReportRow Component
// 🔥 OPTIMIZED: memo, minimal re-renders
// =====================================================

import React, { memo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Bitcoin,
  Building2,
  CalendarDays,
  FileDown,
  Loader2,
  ThumbsUp,
  Bookmark,
  Zap,
} from 'lucide-react';
import { REPORT_TYPE_CONFIG, type Report } from '../utils/helpers';

const ICONS = {
  macro: TrendingUp,
  company: Building2,
  crypto: Bitcoin,
  weekly: CalendarDays,
} as const;

interface ArchiveReportRowProps {
  report: Report;
  onDownload: (report: Report) => void;
  isDownloading: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: (reportId: string) => void;
  onToggleBookmark: (reportId: string) => void;
  isTester?: boolean;
  onPromoteToLive?: (report: Report) => void;
  isPromoting?: boolean;
}

export const ArchiveReportRow = memo(function ArchiveReportRow({
  report,
  onDownload,
  isDownloading,
  isLiked,
  isBookmarked,
  onToggleLike,
  onToggleBookmark,
  isTester,
  onPromoteToLive,
  isPromoting,
}: ArchiveReportRowProps) {
  const config = REPORT_TYPE_CONFIG[report.type];
  const Icon = ICONS[report.type];
  const canPromote = isTester && report.visibility === 'test';

  const getDisplayTitle = () => {
    if (report.type === 'company' && (report.companyName || report.ticker)) {
      return report.companyName || report.ticker;
    }
    return report.title;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
        hover:bg-white/10 hover:border-white/10 transition-all group relative"
    >
      {/* TEST Badge */}
      {report.visibility === 'test' && (
        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[9px] font-bold z-10">
          TEST
        </div>
      )}

      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Title & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.textColor}`}>
            {config.shortName}
          </span>
          <span className="text-gray-600">•</span>
          <span className="text-sm text-white truncate">{getDisplayTitle()}</span>
          {report.ticker && report.type === 'company' && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-xs text-gray-400">
              {report.ticker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span>{format(report.date, 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Promote to Live button */}
        {canPromote && onPromoteToLive && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPromoteToLive(report);
            }}
            disabled={isPromoting}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all
              ${isPromoting
                ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            title="Promote to Live"
          >
            {isPromoting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>{isPromoting ? 'Promoting...' : 'Go Live'}</span>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(report.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
            isLiked
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-amber-400' : ''}`} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(report.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
            isBookmarked
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
        </motion.button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDownloading) onDownload(report);
          }}
          disabled={isDownloading}
          className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} 
            flex items-center gap-1.5 text-xs font-medium text-white 
            hover:opacity-90 transition-all
            ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileDown className="w-3.5 h-3.5" />
          )}
          <span>PDF</span>
        </button>
      </div>
    </motion.div>
  );
});
