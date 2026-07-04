/**
 * DashboardMock — JSX/CSS replica of the WAR ZONE daily briefing UI shown
 * in the "Exclusive Daily Briefing" hero panel of the marketing page.
 *
 * Purely illustrative. No live data, no live links.
 */

import {
  FileText,
  TrendingUp,
  Layers,
  CalendarDays,
  Folder,
  Compass,
} from "lucide-react";
import { Change } from "@/components/ds/NumberDisplay";
import { CornerBrackets } from "./_shared";

const NAV_ITEMS = [
  { icon: FileText, label: "Daily Briefing", active: true },
  { icon: TrendingUp, label: "Markets" },
  { icon: Compass, label: "Macro View" },
  { icon: Layers, label: "Sector Rotation" },
  { icon: FileText, label: "Watchlist" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: Folder, label: "Resources" },
];

const MARKET_TILES = [
  { label: "Technology", change: 0.6, tone: "up" },
  { label: "Communication", change: 0.41, tone: "up" },
  { label: "Consumer", change: 0.35, tone: "up" },
  { label: "Financials", change: -0.22, tone: "down" },
  { label: "Industrials", change: -0.15, tone: "down" },
  { label: "Energy", change: -0.18, tone: "down" },
  { label: "Healthcare", change: -0.05, tone: "down" },
  { label: "Utilities", change: -0.32, tone: "down" },
];

const KEY_LEVELS = [
  { symbol: "SPX", resistance: 7050, support: 6920 },
  { symbol: "QQQ", resistance: 612, support: 595 },
];

const CALENDAR = [
  { time: "8:30", flag: "US", event: "Initial Jobless Claims", forecast: "220K" },
  { time: "10:00", flag: "US", event: "Existing Home Sales", forecast: "4.20M" },
  { time: "2:00", flag: "US", event: "FOMC Member Speaks", forecast: "—" },
];

const FOOTER_TICKERS = [
  { sym: "ES", price: "7,028.50", change: 0.58 },
  { sym: "NQ", price: "24,612.00", change: 0.74 },
  { sym: "YM", price: "44,210.00", change: 0.28 },
  { sym: "CL", price: "72.18", change: -0.31 },
  { sym: "GC", price: "2,648.40", change: 0.17 },
  { sym: "BTC", price: "98,420.00", change: 1.22 },
];

function ConvictionMeter({ value = 72 }: { value?: number }) {
  return (
    <div>
      <div className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mb-2">
        Conviction Meter
      </div>
      <div className="font-mono text-2xl text-ink-primary mb-2 tabular-nums">
        {value}%
      </div>
      <div className="relative h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${value}%`,
            background:
              "linear-gradient(90deg, #A88838 0%, #C9A646 50%, #F4D97B 100%)",
          }}
        />
      </div>
      <div className="flex justify-between mt-2 font-sans text-[9px] uppercase tracking-[1.5px] text-ink-tertiary">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

export default function DashboardMock() {
  return (
    <div className="relative bg-surface-1 border-[0.5px] border-gold-border rounded-[16px] overflow-hidden shadow-[0_24px_60px_-24px_rgba(201,166,70,0.4)]">
      <CornerBrackets size={14} color="rgba(201,166,70,0.6)" />

      <div className="grid grid-cols-12 min-h-[480px]">
        {/* Sidebar */}
        <aside className="col-span-3 border-r-[0.5px] border-border-ds-subtle bg-surface-base/40 p-4">
          <div className="flex items-center gap-2 mb-6">
            <Compass className="w-4 h-4 text-gold-primary" strokeWidth={1.5} />
            <span className="font-display tracking-[2px] text-xs uppercase text-ink-primary">
              Top Secret
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={
                    item.active
                      ? "flex items-center gap-2 px-3 py-2 rounded-[8px] bg-surface-2 border-[0.5px] border-gold-border text-ink-primary"
                      : "flex items-center gap-2 px-3 py-2 rounded-[8px] text-ink-tertiary hover:text-ink-secondary"
                  }
                >
                  <Icon
                    className={
                      item.active
                        ? "w-3.5 h-3.5 text-gold-primary"
                        : "w-3.5 h-3.5"
                    }
                    strokeWidth={1.5}
                  />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <div className="col-span-9 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-sans text-[10px] uppercase tracking-[2px] text-ink-tertiary">
                Daily Briefing
              </div>
              <div className="font-serif text-lg text-ink-primary leading-tight">
                May 21, 2025 — 9:00 AM
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border-[0.5px] border-gold-border">
              <span className="relative inline-flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-gold-primary opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-gold-primary shadow-[0_0_6px_2px_rgba(201,166,70,0.6)]" />
              </span>
              <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-gold-primary">
                Live
              </span>
            </div>
          </div>

          {/* Two columns: Market Overview + Analysis | Key Levels + Conviction */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-7">
              <div className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mb-2">
                Market Overview
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MARKET_TILES.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2 px-2 py-2"
                  >
                    <div className="font-sans text-[9px] uppercase tracking-[1px] text-ink-tertiary leading-tight">
                      {tile.label}
                    </div>
                    <div className="mt-1">
                      <Change
                        value={tile.change}
                        format="percent"
                        decimals={2}
                        className="text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[10px] border-[0.5px] border-border-ds-subtle bg-surface-2 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">
                    Top Secret Analysis
                  </span>
                  <div className="flex gap-1">
                    <span className="px-2 py-0.5 rounded-full border-[0.5px] border-border-ds-subtle text-[9px] uppercase tracking-wider text-ink-tertiary">
                      Bias
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gradient-gold text-ink-on-gold text-[9px] uppercase tracking-wider font-semibold">
                      Bullish
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-ink-secondary leading-relaxed">
                  Strength in tech leadership continues. Breadth is improving
                  and positioning remains light. Watching 7050 as the key
                  breakout level.
                </p>
              </div>
            </div>

            <div className="col-span-5 flex flex-col gap-3">
              <div className="rounded-[10px] border-[0.5px] border-border-ds-subtle bg-surface-2 p-3">
                <div className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mb-2">
                  Key Levels
                </div>
                {KEY_LEVELS.map((row) => (
                  <div
                    key={row.symbol}
                    className="grid grid-cols-3 items-center gap-2 py-1 border-b-[0.5px] border-border-ds-subtle last:border-b-0"
                  >
                    <span className="font-mono text-xs text-ink-primary">
                      {row.symbol}
                    </span>
                    <div className="text-right">
                      <div className="font-sans text-[9px] uppercase tracking-[1px] text-ink-tertiary">
                        Resistance
                      </div>
                      <div className="font-mono text-xs text-ink-primary tabular-nums">
                        {row.resistance.toLocaleString('en-US')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-sans text-[9px] uppercase tracking-[1px] text-ink-tertiary">
                        Support
                      </div>
                      <div className="font-mono text-xs text-ink-primary tabular-nums">
                        {row.support.toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[10px] border-[0.5px] border-border-ds-subtle bg-surface-2 p-3">
                <ConvictionMeter value={72} />
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="rounded-[10px] border-[0.5px] border-border-ds-subtle bg-surface-2 p-3">
            <div className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mb-2">
              Economic Calendar
            </div>
            <div className="flex flex-col gap-1.5">
              {CALENDAR.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 items-center gap-2 text-[11px] py-0.5"
                >
                  <span className="col-span-2 font-mono text-ink-secondary">
                    {row.time}
                  </span>
                  <span className="col-span-1 font-sans text-[9px] uppercase tracking-wider text-gold-primary">
                    {row.flag}
                  </span>
                  <span className="col-span-7 text-ink-primary">
                    {row.event}
                  </span>
                  <span className="col-span-2 text-right font-mono text-ink-tertiary text-[10px]">
                    Forecast: {row.forecast}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer tickers */}
      <div className="border-t-[0.5px] border-border-ds-subtle bg-surface-base/60 px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1">
          {FOOTER_TICKERS.map((t) => (
            <div key={t.sym} className="flex items-center gap-2 text-[10px]">
              <span className="font-sans uppercase tracking-[1px] text-ink-tertiary">
                {t.sym}
              </span>
              <span className="font-mono text-ink-primary tabular-nums">
                {t.price}
              </span>
              <Change value={t.change} format="percent" decimals={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
