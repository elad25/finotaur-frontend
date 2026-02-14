// src/components/stock-analyzer/TabNav.tsx
// =====================================================
// 🗂️ STOCK ANALYZER — Tab Navigation
// =====================================================
// UPDATED: Added Options tab (7 tabs total)
// =====================================================

import { memo } from 'react';
import {
  Building2, Briefcase, BarChart3, Scale,
  Award, CalendarCheck, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardStyle } from '@/constants/stock-analyzer.constants';
import type { TabType } from '@/types/stock-analyzer.types';

export const TAB_CONFIG: { id: TabType; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'financials', label: 'Financials', icon: BarChart3 },
  { id: 'valuation', label: 'Valuation', icon: Scale },
  { id: 'wallstreet', label: 'Wall Street', icon: Award },
  { id: 'earnings', label: 'Earnings', icon: CalendarCheck },
  { id: 'options', label: 'Options', icon: Target },
];

export const TabNav = memo(
  ({
    activeTab,
    onTabChange,
  }: {
    activeTab: TabType;
    onTabChange: (t: TabType) => void;
  }) => (
    <div
      className="flex items-center gap-1 p-1.5 rounded-xl overflow-x-auto scrollbar-none"
      style={cardStyle()}
    >
      {TAB_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 whitespace-nowrap',
              isActive ? 'text-black' : 'text-[#8B8B8B] hover:text-[#C9A646]'
            )}
            style={
              isActive
                ? {
                    background:
                      'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    boxShadow: '0 4px 20px rgba(201,166,70,0.4)',
                  }
                : {}
            }
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">{tab.label}</span>
          </button>
        );
      })}
    </div>
  )
);

TabNav.displayName = 'TabNav';