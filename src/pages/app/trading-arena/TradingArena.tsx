/**
 * Trading Arena — full-screen trading workstation (admin + beta only).
 *
 * Tab restructure (2026-07): the tab bar is 4 tabs — Chart, Order Flow,
 * Liquidity, DOM. The former Tape / CVD / Options / Futures / Forex
 * tabs were removed from navigation (files kept on disk, just unrouted —
 * see tabs/TapeTab.tsx, tabs/CvdTab.tsx, tabs/LockedTab.tsx,
 * tabs/FuturesChartTab.tsx). Chart is a PLAIN candlestick chart — no order
 * flow overlay. The Order Flow tab (slug 'order-flow', component
 * tabs/FootprintTab.tsx — renamed from "Footprint" in the tab bar/nav, file
 * kept as-is) is the dedicated full-detail footprint chart; legacy
 * 'footprint' / 'orderflow' deep links still resolve there — see
 * types.ts's toTabId. Futures capability (admin-only Databento preview)
 * lives INSIDE the Order Flow tab, switched by detected asset class.
 * DOM (slug 'dom', component tabs/DomTab.tsx — "Arena WOW Week" S3) is a
 * clickable price ladder with a lifted paper-trading session shared with its
 * own PaperTradeRail instance.
 *
 * Phase 0 scaffold (still applies):
 *   - Full viewport, no app chrome (added to HIDE_CHROME_ROUTES via
 *     ProtectedAppLayout + NO_SIDEBAR_ROUTES / NO_SUBNAV_ROUTES).
 *   - Slim custom top bar: title + back control, asset selector,
 *     interval selector, tab switcher.
 *   - Tabs (URL-driven via :section param):
 *       Chart       → FinotaurChart + BinanceSource, plain candlesticks
 *       Order Flow  → dedicated full-detail order-flow footprint (crypto + futures)
 *       Liquidity   → Bookmap-style liquidity heatmap (DepthMatrixLayer, crypto only)
 *       DOM         → clickable price ladder (crypto + futures via NT8 bridge)
 *
 * Gating: wrapped in <AdminBetaGate> at the route level (App.tsx).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, ChevronLeft } from 'lucide-react';
import {
  SymbolAutocomplete,
} from '@/components/backtest/SymbolAutocomplete';
import {
  detectAssetClass,
  type AssetClass,
} from '@/components/backtest/symbolUniverse';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toTabId } from './types';
import { getIntervalCapability, type ArenaInterval } from './utils/intervals';
import { ChartTab }    from './tabs/ChartTab';
import { FootprintTab }  from './tabs/FootprintTab';
import { LiquidityTab }  from './tabs/LiquidityTab';
import { DomTab }        from './tabs/DomTab';
import { ArenaToolbar } from './components/ArenaToolbar';
import { ArenaTabSwitcher } from './components/ArenaTabSwitcher';
import { ArenaWorkspaceTabs } from './components/ArenaWorkspaceTabs';
import { AccountSelector } from './components/AccountSelector';
import { ArenaBrokerConnect } from './components/ArenaBrokerConnect';
import { useArenaIndicatorPreferences } from './hooks/useArenaIndicatorPreferences';
import { useArenaOrderflowPrefetch } from './hooks/useArenaOrderflowPrefetch';
import { useChartStylePreferences } from './hooks/useChartStylePreferences';
import { useArenaWorkspaces } from './hooks/useArenaWorkspaces';
import { ChartStyleContext } from './components/chartStyleSettings';
import { buildIndicatorsFromArenaSettings } from './components/indicatorsSettings';
import type { Indicator } from '@/components/charting/types';

// ---------------------------------------------------------------------------
// Default symbol and interval — the ACTUAL defaults now live in
// hooks/useArenaWorkspaces.ts (its own local literals, same values, kept
// separate to avoid a circular import). symbol/interval/assetClass state
// below is hydrated from the active workspace instead of these.
// ---------------------------------------------------------------------------

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

  // NinjaTrader-style bottom workspace tabs — each tab remembers its own
  // { view, symbol, interval, assetClass } context (see
  // hooks/useArenaWorkspaces.ts). Mounted BEFORE the symbol/interval/
  // assetClass useStates below so their lazy initializers can read the
  // hydrated `activeWorkspace` on first render (zero-flicker restore).
  const {
    workspaces,
    activeId: activeWorkspaceId,
    activeWorkspace,
    addWorkspace,
    removeWorkspace,
    selectWorkspace,
    renameWorkspace,
    updateActiveWorkspace,
  } = useArenaWorkspaces();

  // Asset and interval are held in component state, hydrated from the active
  // workspace on first render. Every subsequent user-driven change writes
  // through to the active workspace (see handleSymbolSelect /
  // handleIntervalChange below) so it's remembered when tabs are switched.
  const [symbol, setSymbol] = useState(() => activeWorkspace.symbol);
  const [interval, setIntervalValue] = useState<ArenaInterval>(() => activeWorkspace.interval);
  const [assetClass, setAssetClass] = useState<AssetClass>(() => activeWorkspace.assetClass);

  // Which timeframe menu sections are usable for the active symbol — only
  // crypto (Binance) has a live trades feed, so it's the only asset class
  // that can serve sub-minute bars. Recomputed only when assetClass flips.
  const intervalCapability = useMemo(() => getIntervalCapability(assetClass), [assetClass]);

  // Selected real account for the header's account selector. Display/context
  // only for now — NOT wired into the paper-trading engine or order routing;
  // the Arena stays 100% paper (real execution is out of scope here).
  const [accountId, setAccountId] = useState<string | null>(null);

  // Indicators — single source of truth shared across Chart / Order Flow
  // tabs, so switching tabs keeps the same selection on screen. Persisted
  // via useArenaIndicatorPreferences (arena-only localStorage key — does
  // NOT touch Backtest/Journal's saved preferences). Starts empty (no
  // indicators, except Volume Profile which defaults on) until the user
  // edits via ArenaToolbar's Indicators (N) popup (see IndicatorsDialog.tsx).
  const {
    enabled: indicatorsEnabled,
    params: indicatorsParams,
    updateEnabled: updateIndicatorsEnabled,
    updateParams: updateIndicatorsParams,
    reset: resetIndicators,
  } = useArenaIndicatorPreferences();

  // Chart Settings (Chart ▾ menu) — single source of truth shared across all
  // 3 tabs. Persisted globally (not per-symbol) via useChartStylePreferences.
  // Reaches each tab's FinotaurChart through ChartStyleContext (provided
  // below, around <main>) instead of prop threading — see
  // chartStyleSettings.ts's header comment for why.
  const { settings: chartStyle, update: updateChartStyle, reset: resetChartStyle } = useChartStylePreferences();
  const [chartSettingsDialogOpen, setChartSettingsDialogOpen] = useState(false);

  const indicators = useMemo<Indicator[]>(
    () => buildIndicatorsFromArenaSettings(indicatorsEnabled, indicatorsParams, interval),
    [indicatorsEnabled, indicatorsParams, interval],
  );

  // Order-flow raw-trade cache warm-up (PR 3, H4) — mounts a fire-and-forget
  // phase-1-sized backfill into flowStoreCache regardless of which tab is
  // active, so opening the Order Flow tab later paints instantly. Crypto
  // only — see the hook's own header comment.
  useArenaOrderflowPrefetch(symbol, assetClass);

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
    // Write-through — remember this context on the active workspace tab.
    updateActiveWorkspace({ symbol: arenaSymbol, assetClass: detected });
  }, [updateActiveWorkspace]);

  // Wraps ArenaToolbar's interval setter to also write through to the active
  // workspace (ArenaToolbar/TimeframeMenu are owned by another concurrent
  // session — this wrapper is the only touchpoint needed on this side).
  const handleIntervalChange = useCallback((next: ArenaInterval) => {
    setIntervalValue(next);
    updateActiveWorkspace({ interval: next });
  }, [updateActiveWorkspace]);

  const handleBack = useCallback(() => {
    navigate('/app/home');
  }, [navigate]);

  // ── Workspace-switch sync (activeId → local state + URL) ───────────────
  // Fires whenever the ACTIVE workspace changes identity (tab select / "+"
  // add / close-that-removes-the-active-tab) — NOT on every write-through
  // edit to the currently active workspace's fields (those don't change
  // `activeWorkspaceId`, so this effect stays quiet during normal typing/
  // symbol/interval edits). Skipped on mount: the initial symbol/interval/
  // assetClass state already came from `activeWorkspace` via the lazy
  // initializers above, and initial view/URL reconciliation is handled by
  // the dedicated effect below — running both on the same mount tick would
  // race two `navigate()` calls against each other.
  const didMountWorkspaceSyncRef = useRef(false);
  useEffect(() => {
    if (!didMountWorkspaceSyncRef.current) {
      didMountWorkspaceSyncRef.current = true;
      return;
    }
    setSymbol(activeWorkspace.symbol);
    setAssetClass(activeWorkspace.assetClass);
    setIntervalValue(activeWorkspace.interval);
    if (activeWorkspace.view !== activeTab) {
      navigate(`/app/trading-arena/${activeWorkspace.view}`);
    }
    // Only `activeWorkspaceId` should re-trigger this — activeWorkspace/
    // activeTab/navigate are read fresh from the same render's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  // ── URL (activeTab) ⇄ active workspace's `view` sync ────────────────────
  // First run (mount): if the route has NO explicit :section, restore the
  // active workspace's remembered view via navigation (replace, so it
  // doesn't add a back-stack entry). If the route DOES have an explicit
  // :section (deep link), adopt it into the active workspace instead —
  // falls through to the generic sync below.
  // Later runs: keeps the active workspace's `view` in sync with whatever
  // ArenaTabSwitcher navigates to (that component only calls `navigate`, it
  // doesn't know about workspaces) — guarded by an inequality check so it
  // never fights the workspace-switch effect above (once that effect
  // navigates to match `activeWorkspace.view`, the two values are already
  // equal by the time this effect re-runs).
  const didMountViewSyncRef = useRef(false);
  useEffect(() => {
    if (!didMountViewSyncRef.current) {
      didMountViewSyncRef.current = true;
      if (section === undefined) {
        if (activeWorkspace.view !== 'chart') {
          navigate(`/app/trading-arena/${activeWorkspace.view}`, { replace: true });
        }
        return;
      }
      // Deep link — fall through to the generic adopt-into-workspace check.
    }
    if (activeWorkspace.view !== activeTab) {
      updateActiveWorkspace({ view: activeTab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

          {/* Tab switcher — Chart / Order Flow / Liquidity. URL stays the
              source of truth; this only navigates. */}
          <ArenaTabSwitcher activeTab={activeTab} />

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

          {/* Controls (Timeframe / Indicators) */}
          <ArenaToolbar
            interval={interval}
            onIntervalChange={handleIntervalChange}
            intervalCapability={intervalCapability}
            activeTab={activeTab}
            indicatorsEnabled={indicatorsEnabled}
            indicatorsParams={indicatorsParams}
            onIndicatorsEnabledChange={updateIndicatorsEnabled}
            onIndicatorsParamsChange={updateIndicatorsParams}
            onIndicatorsReset={resetIndicators}
            chartStyle={chartStyle}
            onChartStyleChange={updateChartStyle}
            onChartStyleReset={resetChartStyle}
            chartSettingsDialogOpen={chartSettingsDialogOpen}
            onChartSettingsDialogOpenChange={setChartSettingsDialogOpen}
            assetClass={assetClass}
          />
        </div>

        {/* Right: broker connect entry point + real-account selector (display/context only — see accountId comment above) */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <ArenaBrokerConnect />
          <AccountSelector value={accountId} onChange={setAccountId} />
        </div>
      </header>

      {/* ── Content area ─────────────────────────────────────────── */}
      {/* ChartStyleContext.Provider — makes the Chart ▾ menu's live settings
          reach every FinotaurChart instance across all 3 tabs (Chart /
          Order Flow / Liquidity) WITHOUT threading a chartStyle prop through
          ChartTab/FootprintTab/LiquidityTab. Each FinotaurChart reads this
          context as a fallback only when its own `chartStyle` prop is
          undefined (which it always is for these 3 call sites today) — see
          chartStyleSettings.ts's ChartStyleContext doc comment. */}
      <ChartStyleContext.Provider value={chartStyle}>
        <main className="flex flex-1 min-h-0 overflow-hidden" role="tabpanel">
          {activeTab === 'chart' && (
            <ChartTab
              symbol={symbol}
              interval={interval}
              assetClass={assetClass}
              indicators={indicators}
              volumeProfileEnabled={indicatorsEnabled.volumeProfile}
              onOpenSettings={() => setChartSettingsDialogOpen(true)}
            />
          )}
          {activeTab === 'order-flow' && (
            <FootprintTab
              symbol={symbol}
              interval={interval}
              assetClass={assetClass}
              isAdmin={isAdmin}
              indicators={indicators}
              onSelectSymbol={handleSymbolSelect}
            />
          )}
          {activeTab === 'liquidity' && (
            <LiquidityTab
              symbol={symbol}
              interval={interval}
              assetClass={assetClass}
              onSelectSymbol={handleSymbolSelect}
            />
          )}
          {activeTab === 'dom' && (
            <DomTab
              symbol={symbol}
              interval={interval}
              assetClass={assetClass}
              onSelectSymbol={handleSymbolSelect}
            />
          )}
        </main>
      </ChartStyleContext.Provider>

      {/* ── Bottom workspace tabs (NinjaTrader-style) ──────────────────── */}
      <ArenaWorkspaceTabs
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        onSelect={selectWorkspace}
        onAdd={addWorkspace}
        onRemove={removeWorkspace}
        onRename={renameWorkspace}
      />
    </div>
  );
}

