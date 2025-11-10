// src/components/admin/StatsCard.tsx
// ============================================
// Stats Card Component for Admin Dashboard
// ============================================

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  subtitle?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  subtitle,
  className = '',
}: StatsCardProps) {
  const changeColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-400',
  }[changeType];

  return (
    <div
      className={`bg-[#111111] border border-gray-800 rounded-lg p-6 hover:border-[#D4AF37]/30 transition-all ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {change && (
            <p className={`text-sm font-medium mt-2 ${changeColor}`}>
              {change}
            </p>
          )}
        </div>
        <div className="ml-4">
          <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-[#D4AF37]" />
          </div>
        </div>
      </div>
    </div>
  );
}