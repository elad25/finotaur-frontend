import { getAssetMultiplier } from '@/utils/tradeCalculations';

export type R1Source = 'trade' | 'strategy' | 'stop' | 'global';

export interface StrategyRConfig {
  planned_1r_usd?: number | null;
  standard_quantity?: number | null;
  default_stop_loss?: number | null;
  /** 'fixed' = use planned_1r_usd; 'percent' = use planned_1r_percent × account_equity_at_entry */
  planned_1r_mode?: 'fixed' | 'percent' | string | null;
  /** Risk as a percent of account equity (e.g. 1 = 1%). Used when planned_1r_mode === 'percent'. */
  planned_1r_percent?: number | null;
}

export interface TradeForR {
  entry_price?: number | null;
  stop_price?: number | null;
  quantity?: number | null;
  multiplier?: number | null;
  symbol?: string | null;
  pnl?: number | null;
  side?: string | null;
  planned_1r_usd?: number | null;
  /** Account equity at trade entry — required for percent-of-equity 1R calculation. */
  account_equity_at_entry?: number | null;
}

export interface Resolved1R {
  value: number | null;
  source: R1Source | null;
}

export function resolvePlanned1R(
  trade: TradeForR,
  strategy: StrategyRConfig | null | undefined,
  globalOneR: number,
): Resolved1R {
  if (trade.planned_1r_usd != null && Number(trade.planned_1r_usd) > 0) {
    return { value: Number(trade.planned_1r_usd), source: 'trade' };
  }
  // Percent-of-equity branch: 1R($) = (percent / 100) * account_equity_at_entry
  if (
    strategy?.planned_1r_mode === 'percent' &&
    strategy.planned_1r_percent != null &&
    Number(strategy.planned_1r_percent) > 0 &&
    trade.account_equity_at_entry != null &&
    Number(trade.account_equity_at_entry) > 0
  ) {
    const value = (Number(strategy.planned_1r_percent) / 100) * Number(trade.account_equity_at_entry);
    if (value > 0) return { value, source: 'strategy' };
  }
  if (strategy?.planned_1r_usd != null && Number(strategy.planned_1r_usd) > 0) {
    return { value: Number(strategy.planned_1r_usd), source: 'strategy' };
  }
  const entry = trade.entry_price != null ? Number(trade.entry_price) : null;
  const stop = trade.stop_price != null ? Number(trade.stop_price) : null;
  const qty = trade.quantity != null ? Number(trade.quantity) : null;
  if (entry != null && stop != null && stop > 0 && qty != null && qty > 0) {
    const mult = trade.multiplier != null && Number(trade.multiplier) > 0
      ? Number(trade.multiplier)
      : getAssetMultiplier(trade.symbol ?? '');
    const stopRisk = Math.abs(entry - stop) * qty * mult;
    if (stopRisk > 0) return { value: stopRisk, source: 'stop' };
  }
  // No global fallback: per-trade R requires a real per-trade basis (trade
  // override / strategy / stop). With none, return null so the UI shows "—"
  // and offers "Set R". The global 1R is used only in Manual mode (handled
  // separately in getTradeData), never as a silent per-trade fallback.
  void globalOneR;
  return { value: null, source: null };
}

export function computeActualR(pnl: number | null | undefined, planned1R: number | null): number | null {
  if (pnl == null || planned1R == null || planned1R <= 0) return null;
  return Number(pnl) / planned1R;
}

export type BehaviorTagKind = 'oversized' | 'stop_not_honored' | 'over_risked';

export interface BehaviorTag {
  kind: BehaviorTagKind;
  label: string;
  detail?: string;
}

export function detectBehavior(
  trade: TradeForR,
  strategy: StrategyRConfig | null | undefined,
  planned1R: number | null,
): BehaviorTag[] {
  const tags: BehaviorTag[] = [];
  const entry = trade.entry_price != null ? Number(trade.entry_price) : null;
  const stop = trade.stop_price != null ? Number(trade.stop_price) : null;
  const qty = trade.quantity != null ? Number(trade.quantity) : null;
  const pnl = trade.pnl != null ? Number(trade.pnl) : null;
  const mult = trade.multiplier != null && Number(trade.multiplier) > 0
    ? Number(trade.multiplier)
    : getAssetMultiplier(trade.symbol ?? '');

  const stdQty = strategy?.standard_quantity != null ? Number(strategy.standard_quantity) : null;
  if (stdQty != null && stdQty > 0 && qty != null && qty > 0) {
    const ratio = qty / stdQty;
    if (ratio >= 1.25) {
      tags.push({ kind: 'oversized', label: `Oversized ${ratio.toFixed(ratio >= 2 ? 0 : 1)}×`, detail: `${qty} vs standard ${stdQty}` });
    }
  }

  const actualRisk = (entry != null && stop != null && stop > 0 && qty != null && qty > 0)
    ? Math.abs(entry - stop) * qty * mult
    : null;

  if (actualRisk != null && planned1R != null && planned1R > 0) {
    const rr = actualRisk / planned1R;
    if (rr >= 1.25) {
      tags.push({ kind: 'over_risked', label: `Risked ${rr.toFixed(rr >= 2 ? 0 : 1)}× your 1R`, detail: `$${actualRisk.toFixed(0)} vs 1R $${planned1R.toFixed(0)}` });
    }
  }

  if (pnl != null && pnl < 0 && actualRisk != null && actualRisk > 0) {
    const lossAbs = Math.abs(pnl);
    if (lossAbs > actualRisk * 1.1) {
      tags.push({ kind: 'stop_not_honored', label: `Stop not honored (${(lossAbs / actualRisk).toFixed(1)}× stop)`, detail: `lost $${lossAbs.toFixed(0)} vs stop $${actualRisk.toFixed(0)}` });
    }
  }

  return tags;
}
