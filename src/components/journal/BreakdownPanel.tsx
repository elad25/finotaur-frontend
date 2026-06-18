// ================================================
// BREAKDOWN PANEL — Symbol / Strategy / Session tabs
// File: src/components/journal/BreakdownPanel.tsx
// ================================================

import React, { useState, useMemo } from "react";
import { HelpCircle } from "lucide-react";
import { type Trade } from "@/hooks/useDashboardData";
import { normalizeSymbol } from "@/utils/normalizeSymbol";
import { tradeR } from "@/utils/rAggregates";

// ------------------------------------------------
// Types
// ------------------------------------------------

type TabKey = "symbol" | "strategy" | "session";

interface GroupRow {
  name: string;
  count: number;
  wins: number;
  netPnl: number;
  totalR: number;
  rCount: number; // trades with a valid R value
  netR: number;   // sum of tradeR() for all trades in this group (nulls skipped)
}

interface SortConfig {
  column: keyof GroupRow | "winrate" | "avgR";
  dir: "asc" | "desc";
}

interface BreakdownPanelProps {
  trades: Trade[];
  unit?: '$' | 'R';
}

// ------------------------------------------------
// Helpers
// ------------------------------------------------

function formatCurrencyLocal(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (value < 0 ? "-$" : "+$") + formatted;
}

function groupTrades(trades: Trade[], tab: TabKey): Map<string, GroupRow> {
  const map = new Map<string, GroupRow>();

  for (const t of trades) {
    let key: string;

    if (tab === "symbol") {
      key = normalizeSymbol(t.symbol) || "(unknown)";
    } else if (tab === "strategy") {
      // TODO: wire this to trade.tags[0] when the tags column lands in the DB query
      // Currently the Trade type has no `tags` field — every trade falls to '(untagged)'
      key = "(untagged)";
    } else {
      key = t.session ?? "(unset)";
    }

    if (!map.has(key)) {
      map.set(key, { name: key, count: 0, wins: 0, netPnl: 0, totalR: 0, rCount: 0, netR: 0 });
    }

    const row = map.get(key)!;
    row.count += 1;
    if ((t.pnl ?? 0) > 0) row.wins += 1;
    row.netPnl += t.pnl ?? 0;

    // R-multiple: prefer actual_user_r → actual_r → rr
    const rVal = t.actual_user_r ?? t.actual_r ?? t.rr;
    if (rVal != null) {
      row.totalR += rVal;
      row.rCount += 1;
    }

    // Net R: sum tradeR() per trade, skip nulls
    const r = tradeR(t);
    if (r != null) {
      row.netR += r;
    }
  }

  return map;
}

function winrateColor(rate: number): string {
  if (rate > 50) return "text-[#4AD295]";
  if (rate >= 40) return "text-[#C9A646]";
  return "text-[#E36363]";
}

function pnlColor(value: number): string {
  return value >= 0 ? "text-[#4AD295]" : "text-[#E36363]";
}

// ------------------------------------------------
// Sortable header cell
// ------------------------------------------------

interface ThProps {
  label: string;
  sortKey: SortConfig["column"];
  current: SortConfig;
  onSort: (key: SortConfig["column"]) => void;
  className?: string;
}

const Th: React.FC<ThProps> = ({ label, sortKey, current, onSort, className = "" }) => {
  const active = current.column === sortKey;
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-medium text-[#888888] cursor-pointer select-none hover:text-[#C9A646] transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && (
        <span className="ml-1 text-[#C9A646]">{current.dir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );
};

// ------------------------------------------------
// Main component
// ------------------------------------------------

const BreakdownPanel: React.FC<BreakdownPanelProps> = ({ trades, unit = '$' }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("symbol");
  const [sort, setSort] = useState<SortConfig>({ column: "netPnl", dir: "desc" });

  const rows = useMemo<GroupRow[]>(() => {
    const grouped = groupTrades(trades, activeTab);
    return Array.from(grouped.values());
  }, [trades, activeTab]);

  const sorted = useMemo<GroupRow[]>(() => {
    return [...rows].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sort.column === "winrate") {
        aVal = a.count > 0 ? (a.wins / a.count) * 100 : 0;
        bVal = b.count > 0 ? (b.wins / b.count) * 100 : 0;
      } else if (sort.column === "avgR") {
        aVal = a.rCount > 0 ? a.totalR / a.rCount : -Infinity;
        bVal = b.rCount > 0 ? b.totalR / b.rCount : -Infinity;
      } else {
        aVal = a[sort.column] as number;
        bVal = b[sort.column] as number;
      }

      return sort.dir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [rows, sort]);

  const handleSort = (col: SortConfig["column"]) => {
    setSort(prev =>
      prev.column === col
        ? { column: col, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { column: col, dir: "desc" }
    );
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "symbol", label: "Symbol" },
    { key: "strategy", label: "Strategy" },
    { key: "session", label: "Session" },
  ];

  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[14px] font-semibold text-white">Performance Breakdown</h3>
        <HelpCircle
          className="h-3.5 w-3.5 cursor-help text-white/38 transition-colors hover:text-[#E8C766]"
          aria-label="Groups your trades by symbol, strategy, or session and compares trades, win rate, net P&L, and average R."
          title="Groups your trades by symbol, strategy, or session and compares trades, win rate, net P&L, and average R."
        />
      </div>

      {/* Tab switcher */}
      <div className="mb-3 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSort({ column: "netPnl", dir: "desc" });
            }}
            className={`rounded-md px-4 py-1.5 text-[11px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-[#C9A646]/55 text-white shadow-[0_0_18px_rgba(201,166,70,0.18)]"
                : "bg-white/[0.045] text-white/56 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="py-10 text-center text-[#666666] text-sm">
          No data for this period
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <Th label="Name" sortKey="name" current={sort} onSort={handleSort} className="min-w-[120px]" />
                <Th label="Trades" sortKey="count" current={sort} onSort={handleSort} />
                <Th label="Win Rate" sortKey="winrate" current={sort} onSort={handleSort} />
                <Th label={unit === 'R' ? "Net R" : "Net P&L"} sortKey={unit === 'R' ? "netR" : "netPnl"} current={sort} onSort={handleSort} />
                <Th label="Avg R" sortKey="avgR" current={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const winrate = row.count > 0 ? (row.wins / row.count) * 100 : 0;
                const avgR = row.rCount > 0 ? row.totalR / row.rCount : null;

                return (
                  <tr
                    key={row.name}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-3 py-2.5 text-sm text-[#F4F4F4] font-medium">{row.name}</td>
                    <td className="px-3 py-2.5 text-sm text-[#A0A0A0]">{row.count} trades</td>
                    <td className={`px-3 py-2.5 text-sm font-medium ${winrateColor(winrate)}`}>
                      {winrate.toFixed(1)}%
                    </td>
                    <td className={`px-3 py-2.5 text-sm font-medium ${unit === 'R' ? pnlColor(row.netR) : pnlColor(row.netPnl)}`}>
                      {unit === 'R'
                        ? `${row.netR >= 0 ? '+' : '-'}${Math.abs(row.netR).toFixed(1)}R`
                        : formatCurrencyLocal(row.netPnl)}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[#A0A0A0]">
                      {avgR != null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default React.memo(BreakdownPanel);
