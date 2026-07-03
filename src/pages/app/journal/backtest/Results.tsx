// ==========================================
// BACKTEST PLAYBOOK GRID (Phase 2 — image 3 parity)
// ==========================================
// TradeZella "Playbook" → our "Strategies". Grid of strategy cards showing
// win rate, Net P&L, Profit Factor, Expectancy, Avg Winner/Loser,
// computed from the user's trades (live + backtest), in Finotaur gold-on-black.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, Plus } from 'lucide-react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useTrades } from '@/hooks/useTradesData';
import { useStrategiesOptimized } from '@/hooks/useStrategies';
import { calculateAllStats, type Trade } from '@/utils/statsCalculations';

interface PlaybookCardData {
  id: string;
  name: string;
  tradeCount: number;
  winRate: number;
  netPnL: number;
  profitFactor: number;
  expectancy: number;
  avgWinner: number;
  avgLoser: number;
}

const GREEN = '#34D399';
const RED = '#E44545';

function isClosed(t: any): boolean {
  return t.exit_price != null || (t.outcome != null && t.outcome !== 'OPEN' && t.pnl != null);
}

function buildCard(strategy: any, allTrades: any[]): PlaybookCardData {
  const trades = allTrades.filter(
    (t: any) => t.strategy_id === strategy.id || t.strategy_name === strategy.name
  );
  const closed = trades.filter(isClosed);
  const stats = calculateAllStats(closed as Trade[]);

  // Avg winner/loser in $ (reference shows currency, not R).
  const winners = closed.filter((t: any) => (t.pnl ?? 0) > 0);
  const losers = closed.filter((t: any) => (t.pnl ?? 0) < 0);
  const sum = (arr: any[]) => arr.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const avgWinner = winners.length ? sum(winners) / winners.length : 0;
  const avgLoser = losers.length ? sum(losers) / losers.length : 0;

  return {
    id: strategy.id,
    name: strategy.name,
    tradeCount: closed.length,
    winRate: stats.winRate,
    netPnL: stats.netPnL,
    profitFactor: stats.profitFactor,
    expectancy: stats.expectancy,
    avgWinner,
    avgLoser,
  };
}

function fmtUsd(v: number): string {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: color ?? '#EAEAEA' }}>
        {value}
      </p>
    </div>
  );
}

function PlaybookCard({ data, onOpen }: { data: PlaybookCardData; onOpen: () => void }) {
  const pnlColor = data.netPnL > 0 ? GREEN : data.netPnL < 0 ? RED : '#EAEAEA';
  const wrColor = data.winRate >= 50 ? GREEN : RED;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#C9A646]/40 hover:bg-white/[0.05] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20 p-2">
            <TrendingUp className="h-4 w-4 text-[#C9A646]" />
          </div>
          <h3 className="text-white font-semibold truncate">{data.name}</h3>
        </div>
        <span className="text-[11px] text-gray-500 shrink-0">
          {data.tradeCount} trade{data.tradeCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-3">
        <Stat label="Win rate" value={`${data.winRate.toFixed(2)}%`} color={wrColor} />
        <Stat label="Net P&L" value={fmtUsd(data.netPnL)} color={pnlColor} />
        <Stat
          label="Profit Factor"
          value={data.profitFactor ? data.profitFactor.toFixed(2) : 'N/A'}
        />
        <Stat label="Expectancy" value={fmtUsd(data.expectancy)} />
        <Stat label="Avg Winner" value={fmtUsd(data.avgWinner)} color={GREEN} />
        <Stat label="Avg Loser" value={fmtUsd(data.avgLoser)} color={data.avgLoser < 0 ? RED : '#EAEAEA'} />
      </div>
    </button>
  );
}

export const BacktestResults = () => {
  const navigate = useNavigate();
  const { id: userId } = useEffectiveUser();
  const { data: strategies = [], isLoading: stratLoading } = useStrategiesOptimized(userId);
  const { data: allTrades = [], isLoading: tradesLoading } = useTrades(userId);

  const cards = useMemo(
    () => (strategies as any[]).map((s) => buildCard(s, allTrades as any[])),
    [strategies, allTrades]
  );

  const loading = stratLoading || tradesLoading;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F4] px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-[#C9A646]" />
          <h1 className="text-2xl font-bold text-white">Playbook</h1>
          <span className="text-sm text-gray-500">
            {strategies.length} strateg{strategies.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/journal/strategies')}
          className="flex items-center gap-1.5 rounded-lg border border-[#C9A646]/30 px-3 py-2 text-sm text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors"
        >
          <Plus className="h-4 w-4" /> New strategy
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading playbook…</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-10 w-10 text-[#C9A646]/40 mx-auto mb-4" />
          <p className="text-gray-400">No strategies yet.</p>
          <p className="text-sm text-gray-600 mt-1">
            Create a strategy and link it to a backtest session to track its performance here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c) => (
            <PlaybookCard key={c.id} data={c} onOpen={() => navigate('/app/journal/strategies')} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BacktestResults;
