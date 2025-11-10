// ==========================================
// STRATEGY SYNC SYSTEM - מערכת סנכרון חיה
// ==========================================
// מערכת זו מחשבת סטטיסטיקות חיות לאסטרטגיות מהטריידים

/**
 * חישוב סטטיסטיקות מפורטות לאסטרטגיה מבוסס על הטריידים
 */
export interface StrategyStats {
  // Basic Stats
  totalTrades: number;
  winRate: number;
  totalR: number;
  netPnL: number;
  
  // Win/Loss Breakdown
  wins: number;
  losses: number;
  breakeven: number;
  
  // Average Stats
  avgR: number;
  avgWinR: number;
  avgLossR: number;
  avgRR: number;
  
  // Risk Metrics
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
  
  // Quality Metrics
  qualityTradeCount: number;
  qualityWinRate: number;
  
  // Profit Factor
  profitFactor: number;
  expectancy: number;
}

/**
 * חישוב כל הסטטיסטיקות לאסטרטגיה
 */
export function calculateStrategyStats(strategyName: string, trades: any[]): StrategyStats {
  // סינון טריידים לפי שם האסטרטגיה (לא ID!)
  const strategyTrades = trades.filter((t: any) => {
    // בדיקה אם השדה strategy תואם לשם האסטרטגיה
    return t.strategy === strategyName;
  });
  
  // אתחול ברירת מחדל
  if (strategyTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalR: 0,
      netPnL: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      avgR: 0,
      avgWinR: 0,
      avgLossR: 0,
      avgRR: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxConsecutiveLosses: 0,
      qualityTradeCount: 0,
      qualityWinRate: 0,
      profitFactor: 0,
      expectancy: 0,
    };
  }

  // חישוב סטטיסטיקות בסיסיות
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalR = 0;
  let netPnL = 0;
  let totalWinR = 0;
  let totalLossR = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxConsecutiveLosses = 0;
  let qualityTradeCount = 0;
  let qualityWins = 0;
  let totalRiskReward = 0;
  let rrCount = 0;

  // מעבר על כל הטריידים
  strategyTrades.forEach((trade: any) => {
    // חישוב R
    const r = trade.metrics?.rr || 0;
    totalR += r;
    
    // חישוב PnL
    const pnl = trade.pnl || 0;
    netPnL += pnl;

    // סיווג לפי תוצאה
    const outcome = trade.outcome || (pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE');
    
    if (outcome === 'WIN') {
      wins++;
      totalWinR += r;
      if (r > largestWin) largestWin = r;
      currentWinStreak++;
      currentLossStreak = 0;
    } else if (outcome === 'LOSS') {
      losses++;
      totalLossR += Math.abs(r);
      if (Math.abs(r) > Math.abs(largestLoss)) largestLoss = r;
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentLossStreak;
      }
    } else {
      breakeven++;
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    // בדיקת Quality Tag
    if (trade.quality_tag === 'YES') {
      qualityTradeCount++;
      if (outcome === 'WIN') qualityWins++;
    }

    // חישוב Risk:Reward ממוצע
    if (trade.metrics?.rr) {
      totalRiskReward += Math.abs(trade.metrics.rr);
      rrCount++;
    }
  });

  // חישובים נוספים
  const totalTrades = strategyTrades.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgR = totalTrades > 0 ? totalR / totalTrades : 0;
  const avgWinR = wins > 0 ? totalWinR / wins : 0;
  const avgLossR = losses > 0 ? totalLossR / losses : 0;
  const avgRR = rrCount > 0 ? totalRiskReward / rrCount : 0;
  const qualityWinRate = qualityTradeCount > 0 ? (qualityWins / qualityTradeCount) * 100 : 0;

  // Profit Factor = Total Wins / Total Losses
  const totalWinAmount = strategyTrades
    .filter((t: any) => (t.pnl || 0) > 0)
    .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
  const totalLossAmount = Math.abs(
    strategyTrades
      .filter((t: any) => (t.pnl || 0) < 0)
      .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
  );
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;

  // Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const lossRate = totalTrades > 0 ? (losses / totalTrades) : 0;
  const expectancy = (winRate / 100 * avgWinR) - (lossRate * avgLossR);

  return {
    totalTrades,
    winRate,
    totalR,
    netPnL,
    wins,
    losses,
    breakeven,
    avgR,
    avgWinR,
    avgLossR,
    avgRR,
    largestWin,
    largestLoss,
    consecutiveWins: currentWinStreak,
    consecutiveLosses: currentLossStreak,
    maxConsecutiveLosses,
    qualityTradeCount,
    qualityWinRate,
    profitFactor,
    expectancy,
  };
}

/**
 * רכיב לתצוגה תמציתית של סטטיסטיקות באסטרטגיה (בדף הראשי)
 */
export function StrategyStatsCompact({ stats }: { stats: StrategyStats }) {
  if (stats.totalTrades === 0) {
    return (
      <div className="text-xs" style={{ color: '#606060' }}>
        No trades yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mt-3">
      {/* Total Trades */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: '#9A9A9A' }}>Trades:</span>
        <span className="text-sm font-medium" style={{ color: '#EAEAEA' }}>
          {stats.totalTrades}
        </span>
      </div>

      {/* Win Rate */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: '#9A9A9A' }}>WR:</span>
        <span 
          className="text-sm font-medium"
          style={{ 
            color: stats.winRate >= 50 ? '#00C46C' : stats.winRate >= 40 ? '#C9A646' : '#E44545' 
          }}
        >
          {stats.winRate.toFixed(1)}%
        </span>
      </div>

      {/* Total R */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: '#9A9A9A' }}>Total R:</span>
        <span 
          className="text-sm font-medium"
          style={{ 
            color: stats.totalR >= 0 ? '#00C46C' : '#E44545' 
          }}
        >
          {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(1)}R
        </span>
      </div>

      {/* Net P&L */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: '#9A9A9A' }}>P&L:</span>
        <span 
          className="text-sm font-medium"
          style={{ 
            color: stats.netPnL >= 0 ? '#00C46C' : '#E44545' 
          }}
        >
          ${stats.netPnL >= 0 ? '+' : ''}{stats.netPnL.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

/**
 * רכיב לתצוגה מפורטת של סטטיסטיקות (בדף האסטרטגיה עצמה)
 */
export function StrategyStatsDetailed({ stats, strategy }: { stats: StrategyStats; strategy: any }) {
  if (stats.totalTrades === 0) {
    return (
      <div 
        className="rounded-2xl p-8 backdrop-blur-md text-center"
        style={{
          background: 'rgba(14,14,14,0.8)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <p className="text-sm" style={{ color: '#9A9A9A' }}>
          No trades yet for this strategy. Start trading to see live statistics!
        </p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl p-6 backdrop-blur-md"
      style={{
        background: 'rgba(14,14,14,0.8)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderTop: '2px solid #C9A646',
      }}
    >
      <h3 
        className="text-xs uppercase tracking-widest mb-6"
        style={{ color: '#C9A646', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
      >
        Live Strategy Performance
      </h3>
      
      {/* Grid 1: Basic Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <StatBox 
          label="Total Trades" 
          value={stats.totalTrades.toString()} 
          color="#EAEAEA"
        />
        <StatBox 
          label="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`}
          color={stats.winRate >= 50 ? '#00C46C' : stats.winRate >= 40 ? '#C9A646' : '#E44545'}
          sublabel={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
        />
        <StatBox 
          label="Total R" 
          value={`${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(1)}R`}
          color={stats.totalR >= 0 ? '#00C46C' : '#E44545'}
          sublabel={`Avg: ${stats.avgR.toFixed(2)}R`}
        />
        <StatBox 
          label="Net P&L" 
          value={`$${stats.netPnL >= 0 ? '+' : ''}${stats.netPnL.toFixed(2)}`}
          color={stats.netPnL >= 0 ? '#00C46C' : '#E44545'}
        />
      </div>

      {/* Grid 2: Advanced Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <StatBox 
          label="Avg Win" 
          value={`${stats.avgWinR.toFixed(2)}R`}
          color="#00C46C"
          sublabel={`Largest: ${stats.largestWin.toFixed(2)}R`}
        />
        <StatBox 
          label="Avg Loss" 
          value={`${stats.avgLossR.toFixed(2)}R`}
          color="#E44545"
          sublabel={`Largest: ${stats.largestLoss.toFixed(2)}R`}
        />
        <StatBox 
          label="Avg R:R" 
          value={`${stats.avgRR.toFixed(2)}R`}
          color="#C9A646"
          sublabel={`Target: ${strategy.riskRewardTarget || 0}R`}
        />
        <StatBox 
          label="Profit Factor" 
          value={stats.profitFactor.toFixed(2)}
          color={stats.profitFactor >= 2 ? '#00C46C' : stats.profitFactor >= 1 ? '#C9A646' : '#E44545'}
        />
      </div>

      {/* Grid 3: Quality & Risk */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatBox 
          label="Quality Trades" 
          value={`${stats.qualityTradeCount} / ${stats.totalTrades}`}
          color="#C9A646"
          sublabel={`WR: ${stats.qualityWinRate.toFixed(1)}%`}
        />
        <StatBox 
          label="Max Consecutive Losses" 
          value={stats.maxConsecutiveLosses.toString()}
          color={stats.maxConsecutiveLosses >= (strategy.maxConsecutiveLosses || 3) ? '#E44545' : '#C9A646'}
          sublabel={`Limit: ${strategy.maxConsecutiveLosses || 3}`}
        />
        <StatBox 
          label="Expectancy" 
          value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`}
          color={stats.expectancy >= 0 ? '#00C46C' : '#E44545'}
          sublabel="Per trade"
        />
      </div>
    </div>
  );
}

/**
 * רכיב עזר לתיבת סטטיסטיקה
 */
function StatBox({ 
  label, 
  value, 
  color, 
  sublabel 
}: { 
  label: string; 
  value: string; 
  color: string; 
  sublabel?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color }}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs" style={{ color: '#606060' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}