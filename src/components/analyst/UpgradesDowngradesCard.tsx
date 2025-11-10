import React from 'react';
import { getAnalystRatings, type AnalystItem } from '../../services/analyst';

type Props = { symbol: string };

export default function UpgradesDowngradesCard({ symbol }: Props) {
  const [state, setState] = React.useState<
    | { loading: true; error?: undefined; data?: undefined }
    | { loading: false; error?: string; data?: undefined }
    | { loading: false; error?: undefined; data: any }
  >({ loading: true });

  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const data = await getAnalystRatings(symbol);
        if (!live) return;
        setState({ loading: false, data });
      } catch (e: any) {
        if (!live) return;
        setState({ loading: false, error: e?.message || 'Failed to load' });
      }
    })();
    return () => { live = false; };
  }, [symbol]);

  if (!symbol) return null;

  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <h2 className="text-xl font-semibold mb-3">Upgrades &amp; Downgrades</h2>

      {state.loading && <div className="text-sm opacity-70">Loading…</div>}
      {state.error && <div className="text-sm text-red-400">{state.error}</div>}

      {state.data && (
        <div className="space-y-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="opacity-70">Current Price</div>
              <div className="font-semibold">${state.data.price ?? '—'}</div>
            </div>
            <div>
              <div className="opacity-70">Mentions (90d)</div>
              <div className="font-semibold">{state.data.counts.last90d}</div>
            </div>
            <div>
              <div className="opacity-70">Mentions (30d)</div>
              <div className="font-semibold">{state.data.counts.last30d}</div>
            </div>
            <div>
              <div className="opacity-70">% Upside Likelihood</div>
              <div className="font-semibold">{state.data.probability.up ?? '—'}%</div>
            </div>
            <div>
              <div className="opacity-70">% Downside Likelihood</div>
              <div className="font-semibold">{state.data.probability.down ?? '—'}%</div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Firm</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">From</th>
                  <th className="py-2 pr-4">To</th>
                  <th className="py-2 pr-4">Target</th>
                  <th className="py-2 pr-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {state.data.items.slice(0, 25).map((it: AnalystItem, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 pr-4">{new Date(it.date).toISOString().slice(0,10)}</td>
                    <td className="py-2 pr-4">{it.firm || '—'}</td>
                    <td className="py-2 pr-4 capitalize">{it.action || '—'}</td>
                    <td className="py-2 pr-4">{it.fromRating || '—'}</td>
                    <td className="py-2 pr-4">{it.toRating || '—'}</td>
                    <td className="py-2 pr-4">
                      {it.fromTarget != null || it.toTarget != null
                        ? <span>{it.fromTarget ?? '—'} → <span className="font-semibold">{it.toTarget ?? '—'}</span></span>
                        : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      {it.url ? <a className="underline opacity-70 hover:opacity-100" href={it.url} target="_blank" rel="noreferrer">Source</a> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs opacity-60">Data: FinancialModelingPrep</div>
        </div>
      )}
    </div>
  );
}
