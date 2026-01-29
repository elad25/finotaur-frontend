// =====================================================
// TopSecretAdmin - Stat Card Component
// =====================================================

import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  valueColor?: string;
  loading?: boolean;
}

export const StatCard = memo(function StatCard({ title, value, icon: Icon, iconBg, valueColor = 'text-white', loading }: StatCardProps) {
  return (
    <div className="bg-[#0d0d18] rounded-xl p-5 border border-gray-800/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          {loading ? (
            <div className="h-9 flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            </div>
          ) : (
            <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
          )}
        </div>
        <div className={`p-3.5 rounded-xl ${iconBg}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
});
