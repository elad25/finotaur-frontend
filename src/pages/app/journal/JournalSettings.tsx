import PageTitle from "@/components/PageTitle";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangle, TrendingUp, ArrowUp, ArrowDown, Target } from "lucide-react";
import RiskSettingsDialog from "@/components/RiskSettingsDialog";

// 🔥 OPTIMIZED HOOKS
// Journal-scoped page only — account actions (plan changes, cancellation,
// password, logout) live in the main site Settings (/app/settings).
import { useSubscription, FREE_TRADE_LIMIT } from "@/hooks/useSubscription";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useTrades, type Trade } from "@/hooks/useTradesData";
import { usePortfolios } from "@/hooks/usePortfolios";
import { resolveHiddenPortfolioIds } from "@/lib/journal/hiddenAccounts";


// ============================================
// 🔥 STOP-BASED R — aggregation + formatters
// ============================================
// `actual_r` is realized P&L ÷ the risk implied by the stop distance
// (|entry−stop|×qty×multiplier, computed at fetch time). A null value means
// the trade has no usable stop, so it is excluded from every R figure here.
interface StopRAgg {
  avgR: number | null;
  count: number;        // trades that carry a stop-based R
  wins: number;
  losses: number;
  winRate: number | null;
  bestR: number | null;
  worstR: number | null;
  // 💵 dollar layer — what each R is actually worth
  avg1RUsd: number | null;  // avg per-account $ value of 1R (single-account stop)
  netPnl: number;           // per-account realized $ summed across counted trades
  avgPnl: number | null;    // netPnl / count — per-account $ of the average R
  bestPnl: number | null;   // per-account realized $ of the best-R trade
  worstPnl: number | null;  // per-account realized $ of the worst-R trade
}

// `oneRUsdOf` returns the PER-ACCOUNT dollar value of 1R for a trade. Every $
// figure here is normalized per account, because all-accounts rows sum pnl &
// risk across each copied account (copier replication).
function aggregateStopR(list: Trade[], oneRUsdOf: (t: Trade) => number | null): StopRAgg {
  let sum = 0;
  let count = 0;
  let wins = 0;
  let losses = 0;
  let bestR: number | null = null;
  let worstR: number | null = null;
  let bestPnl: number | null = null;
  let worstPnl: number | null = null;
  let r1Sum = 0;
  let r1Count = 0;
  let netPnl = 0;

  for (const t of list) {
    if (t.actual_r === null || t.actual_r === undefined) continue;
    const v = Number(t.actual_r);
    if (!Number.isFinite(v)) continue;
    count++;
    sum += v;
    if (v > 0) wins++;
    else if (v < 0) losses++;

    // Per-account P&L: all-accounts rows sum pnl across every copied account;
    // divide by the number of copied legs so $ figures reflect ONE account.
    const ac = Math.max(1, t.group_trade_ids?.length ?? 1);
    const rawPnl = t.pnl != null && Number.isFinite(Number(t.pnl)) ? Number(t.pnl) : null;
    const pnl = rawPnl !== null ? rawPnl / ac : null;
    if (pnl !== null) netPnl += pnl;

    if (bestR === null || v > bestR) { bestR = v; bestPnl = pnl; }
    if (worstR === null || v < worstR) { worstR = v; worstPnl = pnl; }

    const r1 = oneRUsdOf(t);
    if (r1 != null && Number.isFinite(r1) && r1 > 0) { r1Sum += r1; r1Count++; }
  }

  const decided = wins + losses;
  return {
    avgR: count > 0 ? sum / count : null,
    count,
    wins,
    losses,
    winRate: decided > 0 ? (wins / decided) * 100 : null,
    bestR,
    worstR,
    avg1RUsd: r1Count > 0 ? r1Sum / r1Count : null,
    netPnl,
    avgPnl: count > 0 ? netPnl / count : null,
    bestPnl,
    worstPnl,
  };
}

const fmtR = (r: number | null): string =>
  r === null ? '—' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;

const rColorClass = (r: number | null): string =>
  r === null ? 'text-zinc-400' : r > 0 ? 'text-green-400' : r < 0 ? 'text-red-400' : 'text-zinc-300';

// $ formatter — compact, optional leading + for gains. Returns "—" for null.
const fmtUsd = (n: number | null, signed = false): string => {
  if (n === null || !Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : signed && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const body = abs >= 1000
    ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : abs.toFixed(abs >= 100 ? 0 : 2);
  return `${sign}$${body}`;
};

// ============================================
// 🔥 MAIN COMPONENT - Fully Optimized
// ============================================
export default function JournalSettings() {
  // 🚀 OPTIMIZED HOOKS - All using React Query
  // 🔥 SYNC FIX: Use subscription for live trade counts (updates after each trade)
  const { limits, isFreeJournal, isUnlimitedUser } = useSubscription();
  const { commissions, updateCommission, updateCommissionType, saveSettings: saveCommissionsSettings } = useCommissionSettings();
  const { data: trades = [] } = useTrades(); // Pre-cached for export + R performance
  const { portfolios } = usePortfolios(); // exclude hidden accounts (WHISPER paper) from R Performance

  // Local UI state
  const [isRiskSettingsOpen, setIsRiskSettingsOpen] = useState(false);

// 🔥 R Performance — stop-based R, overall + per-strategy (replaces the old
// balance/portfolio block per Elad 2026-06-19: no balance, R by stop size).
const rPerformance = useMemo(() => {
  // Exclude hidden accounts (e.g. WHISPER paper) — same convention as the rest
  // of the journal's all-accounts views; they only show when explicitly picked.
  const hiddenIds = new Set(resolveHiddenPortfolioIds(portfolios));
  // Closed trades only: risk-only mode stores pnl; summary mode needs an exit.
  const closed = trades.filter((t) =>
    !hiddenIds.has(t.portfolio_id ?? '') &&
    (t.input_mode === 'risk-only'
      ? t.pnl !== null && t.pnl !== undefined
      : t.exit_price != null),
  );

  // Per-account $ value of 1R, consistent with the displayed R. All-accounts
  // rows sum pnl & risk across every copied account; actual_r is the same per
  // account (scale-invariant), so pnl/actual_r recovers the summed 1R — divide
  // by the number of copied legs to land on a single-account figure. Falls back
  // to the summed stop risk (risk_usd) for break-even trades (actual_r ≈ 0).
  const oneRUsdOf = (t: Trade): number | null => {
    const ac = Math.max(1, t.group_trade_ids?.length ?? 1);
    const pnl = t.pnl != null ? Number(t.pnl) : null;
    const r = t.actual_r != null ? Number(t.actual_r) : null;
    if (pnl != null && r != null && Number.isFinite(pnl) && Number.isFinite(r) && r !== 0) {
      return Math.abs(pnl / r) / ac;
    }
    const risk = t.risk_usd != null ? Number(t.risk_usd) : null;
    return risk != null && Number.isFinite(risk) && risk > 0 ? risk / ac : null;
  };

  const overall = aggregateStopR(closed, oneRUsdOf);

  // Group stop-based trades by strategy (each trade already carries strategy_name).
  const groups = new Map<string, { name: string; trades: Trade[] }>();
  for (const t of closed) {
    if (t.actual_r === null || t.actual_r === undefined) continue;
    const key = t.strategy_id || '__unassigned__';
    const name = t.strategy_name || 'Unassigned';
    const g = groups.get(key) ?? { name, trades: [] };
    g.trades.push(t);
    groups.set(key, g);
  }

  const strategies = Array.from(groups.values())
    .map((g) => ({ name: g.name, ...aggregateStopR(g.trades, oneRUsdOf) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => (b.avgR ?? -Infinity) - (a.avgR ?? -Infinity));

  const strategyMaxAbs = Math.max(
    ...strategies.map((s) => Math.abs(s.avgR ?? 0)),
    0.5,
  );

  return {
    overall,
    strategies,
    strategyMaxAbs,
    noStopCount: closed.length - overall.count,
  };
}, [trades, portfolios]);
  // ============================================
  // 🔥 HANDLERS - All memoized with useCallback
  // ============================================
  const handleRiskSettingsClose = useCallback(() => {
    setIsRiskSettingsOpen(false);
  }, []);

  const handleSaveCommissions = useCallback(() => {
    saveCommissionsSettings();
  }, [saveCommissionsSettings]);

  // 🚀 OPTIMIZED EXPORT - Uses cached trades
  const handleExportTrades = useCallback(async () => {
    try {
      if (!trades || trades.length === 0) {
        toast.error("No trades to export");
        return;
      }
      
      const headers = [
        "Date",
        "Symbol",
        "Side",
        "Entry Price",
        "Exit Price",
        "Stop Price",
        "Take Profit",
        "Quantity",
        "P&L",
        "Outcome",
        "Fees",
        "Session",
        "Strategy",
        "Setup"
      ];
      
      const rows = trades.map((trade: any) => {
        return [
          new Date(trade.open_at).toLocaleDateString('en-US'),
          trade.symbol,
          trade.side,
          trade.entry_price,
          trade.exit_price || "",
          trade.stop_price,
          trade.take_profit_price || "",
          trade.quantity,
          trade.pnl || "",
          trade.outcome || "",
          trade.fees,
          trade.session || "",
          trade.strategy || "",
          trade.setup || ""
        ].join(",");
      });
      
      const csvContent = [headers.join(","), ...rows].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `trades_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${trades.length} trades successfully!`);
      
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export trades. Please try again.");
    }
  }, [trades]);

  return (
    <div className="min-h-screen flex justify-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <PageTitle title="Journal Settings" subtitle="Manage your trading preferences" />
        
        {/* 🔥 R Performance — stop-based R + per-strategy (no balance) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">R Performance</h3>
              <p className="text-xs text-zinc-500 mt-1">Average R by stop distance — and what each R is worth in dollars, per account</p>
            </div>
            <button 
              onClick={() => setIsRiskSettingsOpen(true)}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Update Settings
            </button>
          </div>
          
          {/* R Performance — stop-based R + per-strategy. No balance (Elad 2026-06-19). */}
          {rPerformance.overall.count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400 font-medium">No stop-based R yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Set a stop loss on your trades and R is calculated automatically from the stop distance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Average R (by stop) + key stats */}
              <div className="space-y-4">
                <div className="p-6 rounded-xl border-2 border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/5 to-[#C9A646]/10 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C9A646]/10 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-[#C9A646]" />
                      </div>
                      <span className="text-sm font-medium text-zinc-400">Average R (by stop)</span>
                    </div>
                    <div className={`text-5xl font-bold mb-1 ${rColorClass(rPerformance.overall.avgR)}`}>
                      {fmtR(rPerformance.overall.avgR)}
                    </div>
                    {/* 💵 what the average R is actually worth */}
                    <div className={`text-lg font-semibold mb-2 ${rColorClass(rPerformance.overall.avgPnl)}`}>
                      ≈ {fmtUsd(rPerformance.overall.avgPnl, true)}
                      <span className="text-xs font-normal text-zinc-500"> avg / trade</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Across {rPerformance.overall.count} trade{rPerformance.overall.count === 1 ? '' : 's'} · 1R ≈ {fmtUsd(rPerformance.overall.avg1RUsd)} stop · {fmtUsd(rPerformance.overall.netPnl, true)} net
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-xs font-medium text-zinc-400">Win Rate</span>
                    <div className="text-xl font-bold text-white mt-1">
                      {rPerformance.overall.winRate === null ? '—' : `${rPerformance.overall.winRate.toFixed(0)}%`}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {rPerformance.overall.wins}W · {rPerformance.overall.losses}L
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-xs font-medium text-zinc-400">Best / Worst</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ArrowUp className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-bold text-green-400">{fmtR(rPerformance.overall.bestR)}</span>
                      <span className="text-xs text-zinc-500">{fmtUsd(rPerformance.overall.bestPnl, true)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ArrowDown className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-red-400">{fmtR(rPerformance.overall.worstR)}</span>
                      <span className="text-xs text-zinc-500">{fmtUsd(rPerformance.overall.worstPnl, true)}</span>
                    </div>
                  </div>
                </div>

                {rPerformance.noStopCount > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/90 leading-relaxed">
                      {rPerformance.noStopCount} closed trade{rPerformance.noStopCount === 1 ? '' : 's'} have no stop set — excluded from R.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - R by Strategy */}
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-zinc-300" />
                  </div>
                  <span className="text-sm font-medium text-zinc-300">R by Strategy</span>
                </div>

                {rPerformance.strategies.length === 0 ? (
                  <p className="text-xs text-zinc-500">No strategy-tagged trades with a stop yet.</p>
                ) : (
                  <div className="space-y-3">
                    {rPerformance.strategies.map((s, i) => {
                      const pct = Math.min(100, (Math.abs(s.avgR ?? 0) / rPerformance.strategyMaxAbs) * 100);
                      const positive = (s.avgR ?? 0) >= 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300 font-medium truncate pr-2">{s.name}</span>
                            <div className="flex items-baseline gap-2 flex-shrink-0">
                              <span className={`text-sm font-bold ${rColorClass(s.avgR)}`}>{fmtR(s.avgR)}</span>
                              <span className={`text-xs font-semibold ${rColorClass(s.netPnl)}`}>{fmtUsd(s.netPnl, true)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${positive ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {s.count} trade{s.count === 1 ? '' : 's'} · {s.winRate === null ? '—' : `${s.winRate.toFixed(0)}% win`} · 1R ≈ {fmtUsd(s.avg1RUsd)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 🔥 Trade Limits — journal usage only (account/billing lives in /app/settings) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-6">Trade Limits</h3>

          <div className="space-y-4">
            {/* 🔥 v10.3.0: Trade Limits Display - uses live subscription data */}
            <div className="flex items-center justify-between py-4">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  {isFreeJournal ? 'Lifetime trades used' : 'Monthly trades used'}
                </label>
                <p className="text-xs text-zinc-500 mt-1">
                  {isFreeJournal
                    ? `Free tier: ${FREE_TRADE_LIMIT} trades total (never resets)`
                    : isUnlimitedUser
                      ? 'Unlimited trades with your plan'
                      : 'Resets each billing cycle'
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-300">
                  {isFreeJournal
                    ? `${limits?.trade_count || 0} / ${FREE_TRADE_LIMIT}`
                    : isUnlimitedUser
                      ? '∞ / ∞'
                      : `${limits?.current_month_trades_count || 0} / ${limits?.max_trades || 25}`
                  }
                </span>
                {/* Progress indicator */}
                <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${(() => {
                      if (isUnlimitedUser) return 'bg-emerald-500';
                      const used = isFreeJournal
                        ? (limits?.trade_count || 0)
                        : (limits?.current_month_trades_count || 0);
                      const max = isFreeJournal ? FREE_TRADE_LIMIT : (limits?.max_trades || 25);
                      const pct = max > 0 ? (used / max) * 100 : 0;
                      return pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                    })()}`}
                    style={{ 
                      width: isUnlimitedUser ? '100%' : `${Math.min(100, (() => {
                        const used = isFreeJournal
                          ? (limits?.trade_count || 0)
                          : (limits?.current_month_trades_count || 0);
                        const max = isFreeJournal ? FREE_TRADE_LIMIT : (limits?.max_trades || 25);
                        return max > 0 ? (used / max) * 100 : 0;
                      })())}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Commissions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">Trading Commissions</h3>
          <p className="text-sm text-zinc-500 mb-6">Set default commission rates per asset type (% or fixed amount)</p>
          
          <div className="space-y-1">
            {(Object.entries(commissions) as [keyof typeof commissions, any][]).map(([asset, commission]) => (
              <div key={String(asset)} className="flex items-center justify-between py-4 border-b border-zinc-800/50 last:border-0">
                <label className="text-sm font-medium text-zinc-300 capitalize min-w-[120px]">
                  {String(asset)}
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={commission.type}
                    onChange={(e) => updateCommissionType(asset, e.target.value as 'percentage' | 'flat')}
                    className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Fee ($)</option>
                  </select>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={commission.type === "percentage" ? "0.01" : "0.1"}
                      value={commission.value}
                      onChange={(e) => updateCommission(asset, e.target.value)}
                      className="w-28 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={commission.type === "percentage" ? "0.00" : "0.00"}
                    />
                    <span className="text-sm text-zinc-400 min-w-[20px]">
                      {commission.type === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500 max-w-md">
              These settings will be applied to new trades. Existing trades remain unchanged.
            </p>
            <button 
              onClick={handleSaveCommissions}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Commission Settings
            </button>
          </div>
        </div>

        {/* Data Export */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">Data Management</h3>
          <p className="text-sm text-zinc-500 mb-6">Export your trading data</p>
          
          <button 
            onClick={handleExportTrades}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Export All Trades (CSV)
          </button>
        </div>
      </div>

      {/* Modals */}

      <RiskSettingsDialog 
        open={isRiskSettingsOpen}
        onClose={handleRiskSettingsClose}
      />
    </div>
  );
}