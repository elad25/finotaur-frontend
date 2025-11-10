import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';

export default function CompanyLayout() {
  const { symbol = '' } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Example header area — reuse your existing company header component if present
  // We intentionally avoid any internal search in Fundamentals; symbol is from URL only.
  return (
    <div className="space-y-4">
      <header className="pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            {symbol} <span className="text-zinc-400 text-base">Company</span>
          </h1>
          {/* Replace with your global header ticker switch if you have one */}
        </div>
        <div className="mt-3 flex gap-2 text-sm">
          <TabLink to={`/stocks/${symbol}`} label="Overview" active={pathname === `/stocks/${symbol}`}/>
          <TabLink to={`/stocks/${symbol}/fundamentals`} label="Fundamentals" active={pathname.includes('/fundamentals')}/>
          <TabLink to={`/stocks/${symbol}/filings`} label="Filings" active={pathname.includes('/filings')}/>
          <TabLink to={`/stocks/${symbol}/news`} label="News" active={pathname.includes('/news')}/>
        </div>
      </header>
      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}

function TabLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <NavLink
      to={to}
      className={`rounded-lg px-3 py-1.5 transition ${
        active
          ? 'bg-[rgba(255,215,0,0.12)] text-amber-300'
          : 'text-zinc-300 hover:bg-[rgba(255,255,255,0.06)]'
      }`}
    >
      {label}
    </NavLink>
  );
}
