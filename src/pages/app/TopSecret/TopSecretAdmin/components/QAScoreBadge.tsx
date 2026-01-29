// =====================================================
// TopSecretAdmin - QA Score Badge Component
// =====================================================

import React, { memo } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

interface QAScoreBadgeProps {
  score?: number;
  passed?: boolean;
}

export const QAScoreBadge = memo(function QAScoreBadge({ score, passed }: QAScoreBadgeProps) {
  if (!score) return null;

  const color = score >= 85 ? 'emerald' : score >= 75 ? 'yellow' : 'red';
  const colors = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${colors[color]}`}>
      <Shield className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">QA: {score}/100</span>
      {passed && <CheckCircle className="w-3 h-3" />}
    </div>
  );
});
