// src/pages/app/admin/tabs/ComingSoonTab.tsx
// Placeholder for tabs scheduled in later phases.

import { Construction } from 'lucide-react';
import type { AdminTab } from '../config/adminTabs';

interface ComingSoonTabProps {
  tab: AdminTab;
}

export function ComingSoonTab({ tab }: ComingSoonTabProps) {
  const Icon = tab.icon;
  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto bg-[#111111] border border-gray-800 rounded-lg p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{tab.label}</h2>
        {tab.description && (
          <p className="text-gray-400 text-sm mb-6">{tab.description}</p>
        )}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-sm">
          <Construction className="w-4 h-4" />
          <span>Coming in Phase {tab.phase}</span>
        </div>
      </div>
    </div>
  );
}
