// src/pages/app/etfs/Overview.tsx
// =====================================================
// ETF SECTION — Landing / Dashboard
// =====================================================
// Route: /app/etfs/overview
// Search box that navigates to /app/etfs/{TICKER}
// + example ETF chips for quick access.
// =====================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card } from '@/components/ds/Card';

const EXAMPLE_ETFS = [
  { ticker: 'SPY',  name: 'SPDR S&P 500' },
  { ticker: 'QQQ',  name: 'Invesco QQQ' },
  { ticker: 'VOO',  name: 'Vanguard S&P 500' },
  { ticker: 'SCHD', name: 'Schwab US Dividend' },
];

export default function ETFOverview() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (!ticker) return;
    navigate(`/app/etfs/${ticker}/overview`);
  }

  function handleChip(ticker: string) {
    navigate(`/app/etfs/${ticker}/overview`);
  }

  return (
    <div className="mx-auto max-w-[640px] py-ds-9 px-ds-4 flex flex-col items-center gap-ds-6">
      {/* Page heading */}
      <div className="text-center space-y-ds-2">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          ETF Research
        </span>
        <h1 className="text-h2 font-medium text-ink-primary leading-tight">
          ETF Analyzer
        </h1>
        <p className="text-body text-ink-secondary max-w-sm mx-auto">
          Deep research on any ETF — expense ratios, holdings, performance, risk, and the FINO Score.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex gap-ds-2"
        aria-label="Search for an ETF"
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-ds-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter ticker — e.g. SPY, SCHD, VTI"
            className="w-full rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 pl-10 pr-ds-4 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-border-ds-default focus:outline-none"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>
        <button
          type="submit"
          className="rounded-[8px] px-ds-5 py-ds-3 text-sm font-semibold text-ink-on-gold"
          style={{
            background: 'var(--gradient-gold)',
            boxShadow: 'var(--glow-gold-resting)',
          }}
        >
          Analyze
        </button>
      </form>

      {/* Example chips */}
      <Card padding="compact" className="w-full">
        <p className="text-[11px] text-ink-tertiary mb-ds-3 uppercase tracking-wider">
          Popular ETFs
        </p>
        <div className="flex flex-wrap gap-ds-2">
          {EXAMPLE_ETFS.map(({ ticker, name }) => (
            <button
              key={ticker}
              type="button"
              onClick={() => handleChip(ticker)}
              className="flex items-center gap-ds-1 rounded-[6px] border border-border-ds-subtle bg-surface-2 px-ds-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-border-ds-default hover:text-ink-primary"
            >
              <span className="font-data font-medium text-ink-primary">{ticker}</span>
              <span className="text-ink-tertiary">·</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
