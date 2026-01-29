// =====================================================
// TopSecretDashboard - StatsCard Component
// =====================================================

import React, { memo, useMemo } from 'react';
import { Archive } from 'lucide-react';
import { getMonthKey, type Report } from '../utils/helpers';

interface StatsCardProps {
  reports: Report[];
}

export const StatsCard = memo(function StatsCard({ reports }: StatsCardProps) {
  const stats = useMemo(() => {
    const pdfCount = reports.filter(r => r.pdfStoragePath || r.pdfUrl).length;
    const typeCount: Record<string, number> = {};
    reports.forEach(r => {
      typeCount[r.type] = (typeCount[r.type] || 0) + 1;
    });

    const months = new Set(reports.map(r => getMonthKey(r.date)));

    return {
      totalReports: reports.length,
      pdfAvailable: pdfCount,
      monthsCovered: months.size,
      companyCount: typeCount.company || 0,
    };
  }, [reports]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Archive className="w-5 h-5 text-amber-400" />
        Archive Stats
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-white">{stats.totalReports}</div>
          <div className="text-xs text-gray-500">Total Reports</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.pdfAvailable}</div>
          <div className="text-xs text-gray-500">PDFs Ready</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-amber-400">{stats.monthsCovered}</div>
          <div className="text-xs text-gray-500">Months</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-purple-400">{stats.companyCount}</div>
          <div className="text-xs text-gray-500">Company Reports</div>
        </div>
      </div>
    </div>
  );
});
