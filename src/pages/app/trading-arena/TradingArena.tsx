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

import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, ChevronLeft, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CRYPTO_COINS } from '@/data/cryptoCoins';
import type { Interval } from '@/components/charting/types';
import {
  TRADING_ARENA_TABS,
  ARENA_INTERVALS,
  toTabId,
  type TabId,
} from './types';
import { ChartTab }     from './tabs/ChartTab';
import { OrderFlowTab } from './tabs/OrderFlowTab';
import { TapeTab }      from './tabs/TapeTab';
import { LockedTab }    from './tabs/LockedTab';

// ---------------------------------------------------------------------------
// Asset selector — top ~30 coins that have Binance USDT spot pairs.
// ---------------------------------------------------------------------------
const ARENA_COINS = CRYPTO_COINS.slice(0, 30).map((c) => ({
  symbol: `${c.symbol}USDT`,
  label: c.symbol,
}));

// Fallback if the slice above is somehow empty (defensive).
const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_INTERVAL: Interval = '15m';

// ---------------------------------------------------------------------------
// Top bar sub-components
// ---------------------------------------------------------------------------

interface AssetSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

function AssetSelector({ value, onChange }: AssetSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-8 rounded-md border border-[rgba(201,166,70,0.25)] bg-[#0D0D0D]',
        'px-2 text-[12px] font-medium text-[#E8E8E8]',
        'focus:outline-none focus:border-[rgba(201,166,70,0.6)]',
        'transition-colors duration-150 cursor-pointer',
      )}
      aria-label="Select asset"
    >
      {ARENA_COINS.map((c) => (
        <option key={c.symbol} value={c.symbol}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

interface IntervalSelectorProps {
  value: Interval;
  onChange: (v: Interval) => void;
}

function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Select interval">
      {ARENA_INTERVALS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-7 min-w-[32px] rounded px-2 text-[11px] font-semibold transition-all duration-150',
            value === opt.value
              ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border border-[rgba(201,166,70,0.45)]'
              : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border border-transparent',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface TabSwitcherProps {
  active: TabId;
  onSelect: (id: TabId) => void;
}

function TabSwitcher({ active, onSelect }: TabSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5" role="tablist" aria-label="Arena tabs">
      {TRADING_ARENA_TABS.map((tab) => (
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

  // Asset and interval are held in component state.
  // Using URL search params would be ideal for bookmarking, but keeping it
  // simple for Phase 0 (local state is sufficient for a workstation).
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [interval, setIntervalValue] = useState<Interval>(DEFAULT_INTERVAL);

  const handleTabSelect = useCallback(
    (id: TabId) => {
      navigate(`/app/trading-arena/${id}`, { replace: true });
    },
    [navigate],
  );

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

          {/* Asset selector */}
          <AssetSelector value={symbol} onChange={setSymbol} />

          {/* Divider */}
          <span
            className="w-px h-5 flex-shrink-0"
            style={{ background: 'rgba(201,166,70,0.12)' }}
            aria-hidden="true"
          />

          {/* Interval selector */}
          <IntervalSelector value={interval} onChange={setIntervalValue} />
        </div>

        {/* Right: tab switcher */}
        <div className="ml-auto flex-shrink-0">
          <TabSwitcher active={activeTab} onSelect={handleTabSelect} />
        </div>
      </header>

      {/* ── Content area ─────────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 overflow-hidden" role="tabpanel">
        {activeTab === 'chart' && (
          <ChartTab symbol={symbol} interval={interval} />
        )}
        {activeTab === 'order-flow' && (
          <OrderFlowTab symbol={symbol} />
        )}
        {activeTab === 'tape' && (
          <TapeTab symbol={symbol} />
        )}
        {activeTab === 'options' && <LockedTab label="Options" />}
        {activeTab === 'futures'  && <LockedTab label="Futures" />}
        {activeTab === 'forex'    && <LockedTab label="Forex" />}
      </main>
    </div>
  );
}

