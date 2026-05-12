// ==========================================
// ADVANCED TAB — lazy-loaded chunk
// ==========================================
import { useMemo } from "react";
import {
  calculateAllStats,
  getStrategyName,
  type Trade,
  type StrategyStats,
} from "@/utils/statsCalculations";

// ── Asset class classifier ─────────────────────────────────────────────────
const CRYPTO_SYMBOLS  = ['BTC','ETH','SOL','XRP','BNB','ADA','DOGE','AVAX','MATIC','DOT'];
const FOREX_PAIRS     = ['EUR','GBP','USD','JPY','AUD','CAD','CHF','NZD','EURUSD','GBPUSD','USDJPY','AUDUSD'];
const FUTURES_SUFFIX  = ['NQ','ES','YM','RTY','CL','GC','SI','ZB','MNQ','MES'];

function classifyAsset(symbol: string): 'Stocks' | 'Forex' | 'Crypto' | 'Futures' {
  const s = (symbol || '').toUpperCase();
  if (FUTURES_SUFFIX.some(f => s.includes(f)))  return 'Futures';
  if (CRYPTO_SYMBOLS.some(c => s.includes(c)))  return 'Crypto';
  if (FOREX_PAIRS.some(f => s.includes(f)))     return 'Forex';
  return 'Stocks';
}

const ASSET_META: Record<string, { color: string; gradient: string }> = {
  Futures: { color: '#C9A646', gradient: 'rgba(201,166,70,0.12)'  },
  Stocks:  { color: '#63B3ED', gradient: 'rgba(99,179,237,0.12)'  },
  Forex:   { color: '#A78BFA', gradient: 'rgba(167,139,250,0.12)' },
  Crypto:  { color: '#F6AD55', gradient: 'rgba(246,173,85,0.12)'  },
};

export default function AdvancedTab({ stats, trades }: { stats: StrategyStats; trades: Trade[] }) {

  const assetData = useMemo(() => {
    const map = new Map<string, Map<string, Trade[]>>();

    trades.forEach(trade => {
      const asset    = classifyAsset(trade.symbol || '');
      const strategy = trade.strategy_name || getStrategyName(trade.strategy) || 'No Strategy';
      if (!map.has(asset)) map.set(asset, new Map());
      const sMap = map.get(asset)!;
      if (!sMap.has(strategy)) sMap.set(strategy, []);
      sMap.get(strategy)!.push(trade);
    });

    return Array.from(map.entries()).map(([assetClass, stratMap]) => {
      const strategies = Array.from(stratMap.entries()).map(([name, ts]) => {
        const s = calculateAllStats(ts);
        return { name, trades: ts.length, totalR: s.totalR, winRate: s.winRate, avgRR: s.avgRR };
      }).sort((a, b) => b.totalR - a.totalR);

      const allTrades  = strategies.reduce((sum, s) => sum + s.trades, 0);
      const totalR     = strategies.reduce((sum, s) => sum + s.totalR, 0);
      const best       = strategies[0];

      return { assetClass, strategies, allTrades, totalR, best };
    }).sort((a, b) => b.totalR - a.totalR);
  }, [trades]);

  const maxAbsR = Math.max(...assetData.flatMap(a =>
    a.strategies.map(s => Math.abs(s.totalR))
  ), 1);

  return (
    <div className="space-y-5">

      {/* ── Summary row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {(['Futures','Stocks','Forex','Crypto'] as const).map(ac => {
          const found = assetData.find(a => a.assetClass === ac);
          const meta  = ASSET_META[ac];
          return (
            <div
              key={ac}
              className="rounded-xl p-4 transition-all hover:scale-[1.02]"
              style={{
                background: found
                  ? `linear-gradient(135deg, ${meta.gradient} 0%, rgba(10,10,10,0.95) 100%)`
                  : 'rgba(10,10,10,0.6)',
                border: `1px solid ${found ? meta.color + '35' : 'rgba(255,255,255,0.04)'}`,
                boxShadow: found ? `0 4px 20px ${meta.color}08` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: meta.color }}>
                  {ac}
                </span>
                {found && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                  />
                )}
              </div>
              <>
                <div className="text-2xl font-bold tracking-tight mb-1" style={{ color: found ? (found.totalR >= 0 ? '#00C46C' : '#E44545') : '#303030' }}>
                  {found ? `${found.totalR >= 0 ? '+' : ''}${found.totalR.toFixed(1)}R` : '0.0R'}
                </div>
                <div className="text-[11px] mb-3" style={{ color: '#505050' }}>
                  {found ? `${found.allTrades} trades` : '0 trades'}
                </div>
                {found?.best ? (
                  <div
                    className="text-[10px] px-2 py-1 rounded font-medium truncate"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: '#8A8A8A',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Best: {found.best.name}
                  </div>
                ) : (
                  <div
                    className="text-[10px] px-2 py-1 rounded font-medium"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      color: '#303030',
                      border: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    No strategies yet
                  </div>
                )}
              </>
            </div>
          );
        })}
      </div>

      {/* ── Per-asset strategy breakdown ────────────────────────── */}
      {(['Futures','Stocks','Forex','Crypto'] as const).map(ac => {
        const found = assetData.find(a => a.assetClass === ac);
        const meta  = ASSET_META[ac];
        const strategies = found?.strategies || [];

        return (
          <div
            key={ac}
            className="rounded-xl overflow-hidden"
            style={{
              background: 'rgba(10,10,10,0.95)',
              border: `1px solid ${found ? meta.color + '25' : 'rgba(255,255,255,0.04)'}`,
              boxShadow: found ? `0 4px 24px ${meta.color}08` : 'none',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${meta.color}18`, background: found ? meta.gradient : 'rgba(255,255,255,0.01)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ background: found ? `linear-gradient(180deg, ${meta.color}, ${meta.color}40)` : 'rgba(255,255,255,0.06)' }}
                />
                <div>
                  <h3 className="text-sm font-bold tracking-wide" style={{ color: found ? meta.color : '#404040' }}>{ac}</h3>
                  <p className="text-[10px]" style={{ color: '#505050' }}>
                    {found ? `${strategies.length} strategies traded` : 'No trades recorded'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: found ? (found.totalR >= 0 ? '#00C46C' : '#E44545') : '#2A2A2A' }}>
                  {found ? `${found.totalR >= 0 ? '+' : ''}${found.totalR.toFixed(1)}R` : '0.0R'}
                </div>
                <div className="text-[10px]" style={{ color: '#505050' }}>total</div>
              </div>
            </div>

            {/* Strategy rows */}
            <div className="p-4 space-y-3">
              {found ? strategies.map((s, idx) => {
                const barPct = Math.abs(s.totalR) / maxAbsR * 100;
                const isPos  = s.totalR >= 0;
                const isBest = idx === 0;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {isBest && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: meta.color, color: '#000' }}
                          >
                            BEST
                          </span>
                        )}
                        <span className="text-xs font-semibold truncate" style={{ color: '#EAEAEA' }}>
                          {s.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                        <span className="text-[10px]" style={{ color: '#6A6A6A' }}>{s.trades}T</span>
                        <span className="text-[10px]" style={{ color: s.winRate >= 50 ? '#00C46C' : '#E44545' }}>
                          {s.winRate.toFixed(0)}% WR
                        </span>
                        <span className="text-sm font-bold w-16 text-right" style={{ color: isPos ? '#00C46C' : '#E44545' }}>
                          {isPos ? '+' : ''}{s.totalR.toFixed(1)}R
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barPct}%`,
                          background: isPos
                            ? `linear-gradient(90deg, ${meta.color}80, #00C46C)`
                            : 'linear-gradient(90deg, #E4454580, #E44545)',
                        }}
                      />
                    </div>
                  </div>
                );
              }) : (
                [1, 2, 3].map(i => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-3 rounded" style={{ width: `${80 + i * 30}px`, background: 'rgba(255,255,255,0.03)' }} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-3 w-6 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
                        <div className="h-3 w-12 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
                        <div className="h-3 w-14 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
