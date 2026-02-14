// src/features/options-ai/components/TabNav.tsx
// =====================================================
// 🗂️ OPTIONS AI — Tab Navigation (Stock-Analyzer Style)
// =====================================================
// Removed Deep Dive, adopted gold-gradient active tab design
// 4 tabs: Overview | Flow Scanner | Squeeze Detector | Dark Pool
// =====================================================

import { memo } from 'react';
import { Layers, Zap, Flame, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptionsTab } from '../types/options-ai.types';

const TAB_CONFIG: { id: OptionsTab; label: string; icon: typeof Layers }[] = [
  { id: 'overview', label: 'Overview',          icon: Layers },
  { id: 'flow',     label: 'Flow Scanner',      icon: Zap },
  { id: 'squeeze',  label: 'Squeeze Detector',  icon: Flame },
  { id: 'darkpool', label: 'Dark Pool',         icon: Eye },
];

export const TabNav = memo(function TabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: OptionsTab;
  onTabChange: (t: OptionsTab) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 p-1.5 rounded-xl overflow-x-auto scrollbar-none"
      style={{
        background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
        border: '1px solid rgba(201,166,70,0.15)',
      }}
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
  );
});

TabNav.displayName = 'TabNav';