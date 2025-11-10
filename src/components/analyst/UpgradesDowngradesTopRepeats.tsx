
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type Item = {
  symbol: string;
  firm?: string | null;
  date: string;
  action: string;
};

type ChangesResp = {
  from: string;
  to: string;
  items: Item[];
  counts: Record<string, { last90d: number; last30d: number }>;
};

export default function UpgradesDowngradesTopRepeats() {
  const [state, setState] = React.useState<
    | { loading: true; error?: undefined; data?: undefined }
    | { loading: false; error: string; data?: undefined }
    | { loading: false; error?: undefined; data: ChangesResp }
  >({ loading: true });

  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/analyst/changes`, { headers: { 'Accept': 'application/json' }});
        if (!r.ok) throw new Error(`Failed ${r.status}`);
        const data = await r.json();
        if (!live) return;
        setState({ loading: false, data });
      } catch (e: any) {
        if (!live) return;
        setState({ loading: false, error: e?.message || 'Failed to load' });
      }
    })();
    return () => { live = false; };
  }, []);

  if (state.loading) return <div className="text-sm opacity-70">Loading…</div>;
  if (state.error) return <div className="text-sm text-red-400">{state.error}</div>;
  if (!state.data) return null;

  const entries = Object.entries(state.data.counts || {})
    .map(([symbol, c]) => ({ symbol, ...c }))
    .sort((a, b) => (b.last30d - a.last30d) || (b.last90d - a.last90d))
    .slice(0, 50);

  function gotoSymbol(sym: string) {
    const pathname = location.pathname; // stay on current page (/app/stocks/upgrades)
    navigate({ pathname, search: `?symbol=${encodeURIComponent(sym.toUpperCase())}` }, { replace: false });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Most Repeated Symbols (Up/Down changes)</h3>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="py-2 pr-4">Symbol</th>
              <th className="py-2 pr-4">Mentions (30d)</th>
              <th className="py-2 pr-4">Mentions (90d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {entries.map((row) => (
              <tr key={row.symbol} className="hover:bg-white/5 cursor-pointer" onClick={() => gotoSymbol(row.symbol)}>
                <td className="py-2 pr-4 font-semibold">
                  <button
                    type="button"
                    className="underline decoration-dotted hover:decoration-solid"
                    onClick={(e) => { e.stopPropagation(); gotoSymbol(row.symbol); }}
                    aria-label={`Open ${row.symbol}`}
                    title={`Open ${row.symbol}`}
                  >
                    {row.symbol}
                  </button>
                </td>
                <td className="py-2 pr-4">{row.last30d}</td>
                <td className="py-2 pr-4">{row.last90d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs opacity-60">Click a symbol to set it as the active ticker above.</div>
    </div>
  );
}
