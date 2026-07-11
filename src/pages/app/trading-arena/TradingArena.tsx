/**
 * Trading Arena — full-screen trading workstation (admin + beta only).
 *
 * Tab restructure (2026-07): the tab bar is now exactly 3 tabs — Chart,
 * Footprint, Liquidity. The former Tape / CVD / Options / Futures / Forex
 * tabs were removed from navigation (files kept on disk, just unrouted —
 * see tabs/TapeTab.tsx, tabs/CvdTab.tsx, tabs/LockedTab.tsx,
 * tabs/FuturesChartTab.tsx). The former Order Flow tab (BookmapChart) is
 * superseded by the new Liquidity tab (DepthMatrixLayer-based); legacy
 * 'order-flow' deep links still resolve there — see types.ts's toTabId.
 * Futures capability (admin-only Databento preview) now lives INSIDE the
 * Footprint tab, switched by detected asset class — see tabs/FootprintTab.tsx.
 *
 * Phase 0 scaffold (still applies):
 *   - Full viewport, no app chrome (added to HIDE_CHROME_ROUTES via
 *     ProtectedAppLayout + NO_SIDEBAR_ROUTES / NO_SUBNAV_ROUTES).
 *   - Slim custom top bar: title + back control, asset selector,
 *     interval selector, tab switcher.
 *   - Tabs (URL-driven via :section param):
 *       Chart      → FinotaurChart + BinanceSource
 *       Footprint  → dedicated full-detail order-flow footprint (crypto + futures)
 *       Liquidity  → Bookmap-style liquidity heatmap (DepthMatrixLayer, crypto only)
 *
 * Gating: wrapped in <AdminBetaGate> at the route level (App.tsx).
 */

import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, ChevronLeft } from 'lucide-react';
import type { Interval } from '@/components/charting/types';
import {
  SymbolAutocomplete,
} from '@/components/backtest/SymbolAutocomplete';
import {
  detectAssetClass,
  type AssetClass,
} from '@/components/backtest/symbolUniverse';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toTabId } from './types';
import { ChartTab }      from './tabs/ChartTab';
import { FootprintTab }  from './tabs/FootprintTab';
import { LiquidityTab }  from './tabs/LiquidityTab';
import { ArenaToolbar } from './components/ArenaToolbar';
import { AccountSelector } from './components/AccountSelector';
import {
  DEFAULT_ORDER_FLOW_CONTROLS,
  type OrderFlowControlsState,
} from './components/OrderFlowControls';

// ---------------------------------------------------------------------------
// Default symbol and interval
// ---------------------------------------------------------------------------
const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_INTERVAL: Interval = '15m';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TradingArena() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  const activeTab = toTabId(section);

  // Futures (admin-only Databento preview, now inside the Footprint tab) uses
  // the SAME admin check as the Arena's own route-level AdminBetaGate
  // (App.tsx), not a new roles system — see tabs/FootprintTab.tsx.
  const { isAdmin } = useAdminAuth();

  // Asset and interval are held in component state.
  // Using URL search params would be ideal for bookmarking, but keeping it
  // simple for Phase 0 (local state is sufficient for a workstation).
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [interval, setIntervalValue] = useState<Interval>(DEFAULT_INTERVAL);
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto');

  // Selected real account for the header's account selector. Display/context
  // only for now — NOT wired into the paper-trading engine or order routing;
  // the Arena stays 100% paper (real execution is out of scope here).
  const [accountId, setAccountId] = useState<string | null>(null);

  // Order Flow controls — lifted up from ChartTab so the Arena toolbar's
  // "Chart ▾" dropdown (rendered here, above <main>) can host them.
  const [ofControls, setOfControls] = useState<OrderFlowControlsState>(DEFAULT_ORDER_FLOW_CONTROLS);

  const handleSymbolSelect = useCallback((picked: string) => {
    const detected = detectAssetClass(picked);
    // For crypto, ensure the Binance pair format (e.g. 'BTC' → 'BTCUSDT').
    let arenaSymbol = picked;
    if (detected === 'crypto') {
      const upper = picked.toUpperCase();
      arenaSymbol = upper.endsWith('USDT') ? upper : `${upper.replace(/USDT$/i, '')}USDT`;
    }
    setSymbol(arenaSymbol);
    setAssetClass(detected);
  }, []);

  const handleBack = useCallback(() => {
    navigate('/app/home');
  }, [navigate]);

  return (
    <div
      className="flex flex-col w-full h-screen bg-[#08080a] text-[#E8E8E8] overflow-hidden"
      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header
        className="flex flex-shrink-0 items-center gap-3 px-4 border-b"
        style={{
          height: '52px',
          borderColor: 'rgba(201,166,70,0.12)',
          background: 'linear-gradient(180deg, #0D0D0F 0%, #08080a 100%)',
        }}
      >
        {/* Left: title + back */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center h-7 w-7 rounded-md text-[#707070] hover:text-[#C9A646] hover:bg-[rgba(201,166,70,0.08)] transition-colors duration-150 flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Swords
              className="h-4 w-4 flex-shrink-0"
              style={{ color: '#C9A646' }}
              aria-hidden="true"
            />
            <span
              className="text-[13px] font-bold tracking-wide whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 60%, #C9A646 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Trading Arena
            </span>
          </div>

          {/* Divider */}
          <span
            className="w-px h-5 flex-shrink-0"
            style={{ background: 'rgba(201,166,70,0.18)' }}
            aria-hidden="true"
          />

          {/* Asset selector — SymbolAutocomplete (all asset classes) */}
          <SymbolAutocomplete
            symbol={symbol}
            assetClass={assetClass}
            onSelect={handleSymbolSelect}
            variant="toolbar"
            compact
            filterToAssetClass={false}
          />

          {/* Divider */}
          <span
            className="w-px h-5 flex-shrink-0"
            style={{ background: 'rgba(201,166,70,0.12)' }}
            aria-hidden="true"
          />

          {/* Controls (Timeframe / Indicators / Chart) */}
          <ArenaToolbar
            interval={interval}
            onIntervalChange={setIntervalValue}
            activeTab={activeTab}
            controls={ofControls}
            onControlsChange={setOfControls}
            chartControlsDisabled={assetClass !== 'crypto'}
          />
        </div>

        {/* Right: real-account selector (display/context only — see accountId comment above) */}
        <div className="ml-auto flex-shrink-0">
          <AccountSelector value={accountId} onChange={setAccountId} />
        </div>
      </header>

      {/* ── Content area ─────────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 overflow-hidden" role="tabpanel">
        {activeTab === 'chart' && (
          <ChartTab
            symbol={symbol}
            interval={interval}
            assetClass={assetClass}
            controls={ofControls}
            onControlsChange={setOfControls}
          />
        )}
        {activeTab === 'footprint' && (
          <FootprintTab
            symbol={symbol}
            interval={interval}
            assetClass={assetClass}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'liquidity' && (
          <LiquidityTab
            symbol={symbol}
            interval={interval}
            assetClass={assetClass}
          />
        )}
      </main>
    </div>
  );
}

