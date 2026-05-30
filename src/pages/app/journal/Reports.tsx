import { Navigate, useLocation } from 'react-router-dom';
import ReportsTabsNav from '@/components/journal/reports/ReportsTabsNav';

export default function Reports() {
  const location = useLocation();

  if (location.pathname === '/app/journal/reports') {
    return <Navigate to="/app/journal/reports/overview" replace />;
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold text-yellow-100">Reports</h1>
      <p className="text-sm text-zinc-400 mt-1">Performance insights, progress, and AI-powered recaps.</p>
      <ReportsTabsNav />
    </div>
  );
}
