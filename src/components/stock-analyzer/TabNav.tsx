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
      className="flex w-full items-center gap-6 overflow-x-auto border-b border-white/[0.075] px-4 scrollbar-none"
    >
      {TAB_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap px-2 py-4 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'text-ink-primary'
                : 'text-ink-tertiary hover:text-ink-secondary'
            )}
          >
            <Icon className={cn('h-4 w-4', isActive ? 'text-ink-primary' : 'text-ink-tertiary')} />
            <span className="hidden sm:inline">{tab.label}</span>
            {isActive && (
              <span
                className="absolute inset-x-0 bottom-[-1px] h-px rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(232,199,102,0.92), transparent)',
                }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  )
);

TabNav.displayName = 'TabNav';
