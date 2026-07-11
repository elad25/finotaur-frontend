/**
 * Trading Arena — full-screen trading workstation (admin + beta only).
 *
 * Phase 0 scaffold:
 *   - Full viewport, no app chrome (added to HIDE_CHROME_ROUTES via
 *     ProtectedAppLayout + NO_SIDEBAR_ROUTES / NO_SUBNAV_ROUTES).
 *   - Slim custom top bar: title + back control, asset selector,
 *     interval selector, tab switcher.
 *   - Tabs (URL-driven via :section param):
 *       Chart       → FinotaurChart + BinanceSource
 *       Order Flow  → BookmapChart + useBinanceOrderBook (live)
 *       Options     → Locked (coming soon)
 *       Futures     → Locked (coming soon)
 *       Forex       → Locked (coming soon)
 *
 * Gating: wrapped in <AdminBetaGate> at the route level (App.tsx).
 */

import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, ChevronLeft, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Interval } from '@/components/charting/types';
import {
  SymbolAutocomplete,
} from '@/components/backtest/SymbolAutocomplete';
import {
  detectAssetClass,
  type AssetClass,
} from '@/components/backtest/symbolUniverse';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  TRADING_ARENA_TABS,
  toTabId,
  type TabId,
} from './types';
import { ChartTab }        from './tabs/ChartTab';
import { OrderFlowTab }    from './tabs/OrderFlowTab';
import { TapeTab }         from './tabs/TapeTab';
import { CvdTab }          from './tabs/CvdTab';
import { LockedTab }       from './tabs/LockedTab';
import { FuturesChartTab } from './tabs/FuturesChartTab';
import { ArenaToolbar } from './components/ArenaToolbar';
import {
  DEFAULT_ORDER_FLOW_CONTROLS,
  type OrderFlowControlsState,
} from './components/OrderFlowControls';

// ---------------------------------------------------------------------------
// Default symbol and interval
// ---------------------------------------------------------------------------
const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_INTERVAL: Interval = '15m';

interface TabSwitcherProps {
  active: TabId;
  onSelect: (id: TabId) => void;
  /** Tab definitions, pre-resolved per-viewer (e.g. futures unlocked for admins). */
  tabs: typeof TRADING_ARENA_TABS;
}

function TabSwitcher({ active, onSelect, tabs }: TabSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5" role="tablist" aria-label="Arena tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          disabled={tab.locked}
          onClick={() => {
            if (!tab.locked) onSelect(tab.id);
          }}
          className={cn(
            'flex items-center gap-1.5 h-8 rounded-md px-3 text-[12px] font-medium',
            'transition-all duration-150',
            tab.locked
              ? 'cursor-not-allowed opacity-40 text-[#555555]'
              : active === tab.id
                ? 'bg-[rgba(201,166,70,0.15)] text-[#C9A646] border border-[rgba(201,166,70,0.40)] shadow-[0_0_10px_rgba(201,166,70,0.10)]'
                : 'text-[#888888] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)]',
          )}
        >
          {tab.locked && (
            <Lock className="h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TradingArena() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  const activeTab = toTabId(section);

  // Futures is admin-only (the founder's own Tradovate feed) — everyone else
  // sees the same "Coming soon" LockedTab as Options/Forex. Uses the SAME
  // admin check as the Arena's own route-level AdminBetaGate (App.tsx),
  // not a new roles system.
  const { isAdmin } = useAdminAuth();
  const tabs = useMemo(
    () =>
      TRADING_ARENA_TABS.map((tab) =>
        tab.id === 'futures' ? { ...tab, locked: !isAdmin } : tab,
      ),
    [isAdmin],
  );

  // Asset and interval are held in component state.
  // Using URL search params would be ideal for bookmarking, but keeping it
  // simple for Phase 0 (local state is sufficient for a workstation).
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [interval, setIntervalValue] = useState<Interval>(DEFAULT_INTERVAL);
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto');

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

  const handleTabSelect = useCallback(
    (id: TabId) => {
      if (id === 'futures' && !isAdmin) return; // defense-in-depth — tab is already disabled in the UI
      navigate(`/app/trading-arena/${id}`, { replace: true });
    },
    [navigate, isAdmin],
  );

  // Defense-in-depth: a non-admin landing directly on /trading-arena/futures
  // (deep link / stale bookmark) sees LockedTab, never FuturesChartTab —
  // this mirrors the tab-content switch below, not just the tab button state.
  const showFuturesTab = activeTab === 'futures' && isAdmin;

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
            filterToAssetClass={false}
          />
        </div>

        {/* Right: tab switcher */}
        <div className="ml-auto flex-shrink-0">
          <TabSwitcher active={activeTab} onSelect={handleTabSelect} tabs={tabs} />
        </div>
      </header>

      {/* ── Single-row controls strip (Timeframe / Indicators / Chart) ──── */}
      <ArenaToolbar
        interval={interval}
        onIntervalChange={setIntervalValue}
        activeTab={activeTab}
        controls={ofControls}
        onControlsChange={setOfControls}
        chartControlsDisabled={assetClass !== 'crypto'}
      />

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
        {activeTab === 'order-flow' && (
          <OrderFlowTab symbol={symbol} />
        )}
        {activeTab === 'tape' && (
          <TapeTab symbol={symbol} />
        )}
        {activeTab === 'cvd' && (
          <CvdTab symbol={symbol} interval={interval} />
        )}
        {activeTab === 'options' && <LockedTab label="Options" />}
        {showFuturesTab ? (
          <FuturesChartTab interval={interval} />
        ) : (
          activeTab === 'futures' && <LockedTab label="Futures" />
        )}
        {activeTab === 'forex'    && <LockedTab label="Forex" />}
      </main>
    </div>
  );
}

