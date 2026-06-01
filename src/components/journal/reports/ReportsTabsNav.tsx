import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { label: 'Performance', path: '/app/journal/reports/performance' },
  { label: 'Overview', path: '/app/journal/reports/overview' },
  { label: 'Progress', path: '/app/journal/reports/progress' },
  { label: 'Day View', path: '/app/journal/reports/day-view' },
  { label: 'Breakdowns', path: '/app/journal/reports/breakdowns' },
  { label: 'Options', path: '/app/journal/reports/options' },
  { label: 'Calendar', path: '/app/journal/reports/calendar' },
  { label: 'Compare', path: '/app/journal/reports/compare' },
  { label: 'Scores', path: '/app/journal/reports/scores' },
  { label: 'Summary', path: '/app/journal/reports/summary' },
  { label: 'AI Recaps', path: '/app/journal/reports/recaps' },
];

export default function ReportsTabsNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#141414] mt-6">
      <div className="sticky top-0 z-10 backdrop-blur supports-backdrop-blur:bg-black/20 border-b border-white/[0.06] px-4 md:px-6 py-2 flex gap-2 overflow-x-auto">
        {TABS.map(tab => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#C9A646]/55 text-white shadow-[0_0_18px_rgba(201,166,70,0.18)]'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
