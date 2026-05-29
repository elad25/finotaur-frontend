import { useState } from 'react';
import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';
import StreakBadge from '@/components/journal/reports/StreakBadge';
import PeriodScoreCard from '@/components/journal/reports/PeriodScoreCard';
import RulesList from '@/components/journal/reports/RulesList';
import AddRuleInput from '@/components/journal/reports/AddRuleInput';
import RuleEditorModal from '@/components/journal/reports/RuleEditorModal';
import { useProgressTracker } from '@/hooks/useProgressTracker';
import type { ProgressRule } from '@/hooks/useProgressTracker';

export default function ProgressTracker() {
  const tracker = useProgressTracker();
  const [editing, setEditing] = useState<ProgressRule | null>(null);
  const activeCount = tracker.rules.filter(r => r.isActive).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <ReportsTabsNav />

      <div>
        <h2 className="text-2xl font-semibold text-yellow-100">Progress Tracker</h2>
        <p className="text-sm text-zinc-400 mt-1">
          A small daily habit, repeated, beats a one-time sprint.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StreakBadge streak={tracker.streak} />
        <PeriodScoreCard label="Weekly score" score={tracker.weeklyScore} />
        <PeriodScoreCard label="Monthly score" score={tracker.monthlyScore} />
      </div>

      <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-yellow-100">Today's rules</h3>
          <span className="text-xs text-zinc-400">{activeCount}/10 active</span>
        </div>
        <RulesList
          rules={tracker.rules.filter(r => r.isActive).sort((a, b) => a.order - b.order)}
          todayEntries={tracker.todayEntries}
          onToggle={tracker.toggleEntry}
          onEdit={setEditing}
          onDelete={tracker.deleteRule}
        />
        <AddRuleInput onAdd={tracker.addRule} disabled={activeCount >= 10} />
      </div>

      <RuleEditorModal
        open={editing !== null}
        rule={editing}
        onClose={() => setEditing(null)}
        onSave={(id, text) => {
          tracker.updateRule(id, text);
          setEditing(null);
        }}
      />
    </div>
  );
}
