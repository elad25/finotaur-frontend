// =====================================================
// TopSecretDashboard - FilterTabs Component
// =====================================================

import React, { memo } from 'react';

interface FilterTabsProps {
  selected: string;
  onChange: (value: string) => void;
}

const TABS = ['All', 'Macro', 'Company', 'Crypto', 'Weekly'] as const;

export const FilterTabs = memo(function FilterTabs({
  selected,
  onChange,
}: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab.toLowerCase())}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            selected === tab.toLowerCase()
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
});
