import { useEffect, useState } from 'react';
import { api } from '@/lib/apiBase';
import SessionClock from './components/SessionClock';
import DXYTile from './components/DXYTile';
import CurrencyStrengthMeter from './components/CurrencyStrengthMeter';
import TopMovers from './components/TopMovers';
import MarketCommentaryPlaceholder from './components/MarketCommentaryPlaceholder';
import type { ForexMoversResponse, ForexQuote } from './components/types';

export default function ForexOverview() {
  const [movers, setMovers] = useState<ForexMoversResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [marketStatusMessage, setMarketStatusMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(api('/api/top-movers?type=forex&limit=10'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ForexMoversResponse = await res.json();
        if (cancelled) return;
        setMovers(data);
        setMarketStatusMessage(data.marketStatus?.message ?? '');
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load forex data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    const interval = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const allQuotes: ForexQuote[] = movers ? [...(movers.gainers ?? []), ...(movers.losers ?? [])] : [];

  return (
    <div className="space-y-ds-5 animate-fade-in p-ds-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-sans text-[28px] font-semibold text-ink-primary leading-tight">Forex Overview</h1>
          <p className="font-sans text-[13px] text-ink-tertiary mt-ds-1">Live USD strength, major-pair movers, and FX session windows.</p>
        </div>
        {marketStatusMessage && (
          <span className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold-muted">
            {marketStatusMessage}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-ds-4">
        <div className="md:col-span-4"><SessionClock /></div>
        <div className="md:col-span-4"><DXYTile /></div>
        <div className="md:col-span-4"><MarketCommentaryPlaceholder /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-ds-4">
        <div className="md:col-span-7">
          <CurrencyStrengthMeter quotes={allQuotes} loading={loading} errorMessage={error} />
        </div>
        <div className="md:col-span-5">
          <TopMovers
            gainers={movers?.gainers ?? []}
            losers={movers?.losers ?? []}
            loading={loading}
            errorMessage={error}
            limit={5}
          />
        </div>
      </div>
    </div>
  );
}
