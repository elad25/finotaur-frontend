// src/features/options-ai/components/TabNav.tsx
// =====================================================
// OPTIONS AI - Tab Navigation (Stock-Analyzer Style)
// =====================================================
// Removed Deep Dive, adopted gold-gradient active tab design
// 4 tabs: Overview | Flow Scanner | Squeeze Detector | Institutional Flow
// =====================================================

import { memo } from 'react';
import { Brain, Layers, Zap, Flame, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptionsTab } from '../types/options-ai.types';

const TAB_CONFIG: { id: OptionsTab; label: string; icon: typeof Layers; disabled?: boolean }[] = [
  { id: 'overview', label: 'Overview',          icon: Layers },
  { id: 'flow',     label: 'Flow Scanner',      icon: Zap },
  { id: 'squeeze',  label: 'Squeeze Detector',  icon: Flame },
  { id: 'darkpool', label: 'Institutional Flow', icon: Eye },
  { id: 'deepdive', label: 'AI Analysis',       icon: Brain },
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
      className="relative flex w-full max-w-[860px] items-center gap-0 overflow-x-auto rounded-xl p-1 scrollbar-none"
      style={{
        background: 'linear-gradient(135deg, rgba(13,11,8,0.98), rgba(21,18,16,0.94))',
        border: '1px solid rgba(201,166,70,0.24)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-3 font-medium transition-all duration-300',
              isActive ? 'text-black' : tab.disabled ? 'cursor-default text-[#B8B8B8]' : 'text-[#8B8B8B] hover:text-[#C9A646]'
            )}
            style={
              isActive
                ? {
                    background:
                      'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    boxShadow: '0 3px 16px rgba(201,166,70,0.34)',
                  }
                : {}
            }
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[13px]">{tab.label}</span>
            {tab.id !== 'deepdive' && (
              <span className="pointer-events-none absolute right-0 top-1/2 hidden h-6 w-px -translate-y-1/2 bg-[#C9A646]/16 sm:block" />
            )}
          </button>
        );
      })}
    </div>
  );
});

TabNav.displayName = 'TabNav';
