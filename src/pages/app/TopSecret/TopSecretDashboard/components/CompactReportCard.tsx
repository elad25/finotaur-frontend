// =====================================================
// TopSecretDashboard - CompactReportCard Component
// 🔥 OPTIMIZED: memo with proper dependencies
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
} from 'lucide-react';
import { REPORT_TYPE_CONFIG, type Report } from '../utils/helpers';

const ICONS = {
  macro: TrendingUp,
  company: Building2,
  crypto: Bitcoin,
  weekly: CalendarDays,
} as const;

interface CompactReportCardProps {
  report: Report;
  onDownload: (report: Report) => void;
  isDownloading: boolean;
}

export const CompactReportCard = memo(function CompactReportCard({
  report,
  onDownload,
  isDownloading,
}: CompactReportCardProps) {
  const config = REPORT_TYPE_CONFIG[report.type];
  const Icon = ICONS[report.type];

  const getDisplaySubtitle = () => {
    if (report.type === 'company') {
      return report.ticker || report.subtitle || 'Deep-Dive Analysis';
    }
    return report.subtitle || report.title;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-xl border ${config.borderColor} bg-gradient-to-br ${config.bgGradient} p-5 flex flex-col min-h-[280px]`}
    >
      {report.visibility === 'test' && (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold z-10">
          TEST
        </div>
      )}
      {report.isFeatured && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
          NEW
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-9 h-9 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white truncate block">
            {config.shortName}
          </span>
          <span className="text-xs text-gray-500">
            {format(report.date, 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <div className="flex-1 mb-4">
        {getDisplaySubtitle() && getDisplaySubtitle() !== '0' && (
          <h3 className={`text-base font-semibold ${config.textColor} mb-3 line-clamp-2`}>
            {getDisplaySubtitle()}
          </h3>
        )}

        {report.type === 'company' && report.ticker && (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/30 border border-white/10">
            <span className="text-base font-bold text-white">{report.ticker}</span>
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isDownloading) onDownload(report);
        }}
        disabled={isDownloading}
        className={`w-full py-2.5 px-4 rounded-lg bg-gradient-to-r ${config.gradient} 
          flex items-center justify-center gap-2 text-sm font-semibold text-white 
          hover:opacity-90 transition-all whitespace-nowrap
          ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            DOWNLOAD PDF
          </>
        )}
      </button>
    </motion.div>
  );
});
