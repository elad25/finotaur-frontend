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
    <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] mt-6">
      <div className="sticky top-0 z-10 backdrop-blur supports-backdrop-blur:bg-black/20 border-b border-yellow-200/10 px-4 md:px-6 py-2 flex gap-2 overflow-x-auto">
        {TABS.map(tab => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                isActive
                  ? 'bg-yellow-600/25 text-yellow-100 border border-yellow-500/40'
                  : 'text-zinc-300 hover:bg-zinc-800'
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
