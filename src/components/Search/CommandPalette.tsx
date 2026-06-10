
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useTickerSuggest } from '@/hooks/useTickerSuggest';
import { fetchETFList } from '@/services/etf-analyzer.api';
import { routeForSuggest } from '@/lib/tickerRouting';

type Props = { open: boolean; onClose: () => void };

export default function CommandPalette({ open, onClose }: Props) {
  const [q, setQ] = useState('');
  const [hoverIdx, setHoverIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { suggestions, isLoading } = useTickerSuggest(open ? q : '');

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setHoverIdx(i => Math.min(i + 1, suggestions.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHoverIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && hoverIdx >= 0) { e.preventDefault(); goSummary(suggestions[hoverIdx].symbol); }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(t); };
  }, [open, suggestions, hoverIdx, onClose]);

  function onBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
  }

  async function goSummary(sym: string) {
    const upper = sym.toUpperCase();
    onClose();
    // Determine assetType: use fetchETFList as the existing ETF-detection signal.
    // If the symbol is confirmed as an ETF, pass 'etf'; otherwise pass undefined
    // so routeForSuggest defaults to Stock Analyzer (replaces the old /all-markets/summary fallback).
    let resolvedAssetType: 'etf' | undefined;
    try {
      const result = await fetchETFList({ search: upper, limit: 5 });
      const isEtf = result.etfs.some((e) => e.ticker.toUpperCase() === upper);
      if (isEtf) resolvedAssetType = 'etf';
    } catch {
      // fall through — resolvedAssetType stays undefined → stock-analyzer
    }
    navigate(routeForSuggest(upper, resolvedAssetType));
  }
  function goChart(sym: string) {
    const search = createSearchParams({ symbol: sym.toUpperCase() }).toString();
    navigate({ pathname: '/app/all-markets/chart', search });
    onClose();
  }

  if (!open) return null;
  return createPortal(
    <div className="fin-cmdp-backdrop" onMouseDown={onBackdropMouseDown}>
      <div ref={panelRef} className="fin-cmdp-panel" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="fin-cmdp-input-wrap">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setHoverIdx(-1); }}
            placeholder="Search tickers, e.g. AAPL · TSLA · NVDA"
            className="fin-cmdp-input"
          />
        </div>
        <div className="fin-cmdp-list">
          {isLoading && <div className="fin-cmdp-empty">Searching…</div>}
          {!isLoading && suggestions.length === 0 && q && (<div className="fin-cmdp-empty">No matches</div>)}
          {suggestions.map((s, idx) => (
            <div key={s.symbol + idx} onMouseEnter={() => setHoverIdx(idx)} className={`fin-cmdp-row ${idx===hoverIdx ? 'is-active' : ''}`}>
              <div className="fin-cmdp-cell">
                <div className="fin-cmdp-symbol">{s.symbol}</div>
                {s.name && <div className="fin-cmdp-name">{s.name}</div>}
              </div>
              <div className="fin-cmdp-actions">
                <button onClick={() => goChart(s.symbol)} className="fin-cmdp-btn">CHART</button>
                <button onClick={() => goSummary(s.symbol)} className="fin-cmdp-btn fin-cmdp-btn--primary">SUMMARY</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
