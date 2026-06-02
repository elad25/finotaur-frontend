// src/components/portfolio/PortfolioSettingsPanel.tsx
// ═══════════════════════════════════════════════════════════════
// Left "Settings" column in the Create Portfolio modal.
// ~210 px wide, right-side divider.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { UsePortfolioBuilderReturn } from '@/hooks/usePortfolioBuilder';
import { BenchmarkSearch } from './BenchmarkSearch';
import { cn } from '@/lib/utils';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'JPY', 'CAD', 'AUD'] as const;

export interface PortfolioSettingsPanelProps {
  builder: UsePortfolioBuilderReturn;
}

export function PortfolioSettingsPanel({ builder }: PortfolioSettingsPanelProps) {
  const {
    portfolio,
    setCurrency,
    setBenchmarkEnabled,
    setBenchmarkSymbol,
  } = builder;

  return (
    <aside className="w-[210px] shrink-0 flex flex-col gap-5 pr-5 border-r border-border-ds-subtle">
      <h2 className="text-sm font-semibold text-ink-primary">Settings</h2>

      {/* Portfolio Currency */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="portfolio-currency" className="text-xs text-ink-secondary font-medium">
          Portfolio Currency
        </label>
        <select
          id="portfolio-currency"
          value={portfolio.currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={cn(
            'w-full bg-surface-1 border border-border-ds-subtle rounded-md px-2.5 py-1.5',
            'text-sm text-ink-primary',
            'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary',
            'transition-colors cursor-pointer',
          )}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Benchmark */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="benchmark-toggle" className="text-xs text-ink-secondary font-medium">
            Benchmark
          </label>
          {/* Toggle switch */}
          <button
            id="benchmark-toggle"
            type="button"
            role="switch"
            aria-checked={portfolio.benchmarkEnabled}
            onClick={() => setBenchmarkEnabled(!portfolio.benchmarkEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
              'transition-colors duration-200 ease-in-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
              portfolio.benchmarkEnabled ? 'bg-gold-primary' : 'bg-border-ds-default',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
                'transform transition duration-200 ease-in-out',
                portfolio.benchmarkEnabled ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        <BenchmarkSearch
          value={portfolio.benchmarkSymbol}
          onChange={setBenchmarkSymbol}
          disabled={!portfolio.benchmarkEnabled}
        />
      </div>
    </aside>
  );
}
