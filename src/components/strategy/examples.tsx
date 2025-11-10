// ==========================================
// PRACTICAL EXAMPLES: READY-TO-USE CODE
// ==========================================

import { useState, useMemo } from 'react';
import { Strategy, Trade, TradeFormData, StrategyStatistics } from '@/types/strategy';
import { 
  calculateTradeCompliance, 
  enrichTrade,
  calculateStrategyStatistics,
  formatPnl,
  formatR 
} from '@/lib/strategyCalculations';

// ==========================================
// EXAMPLE 1: Strategy Selector Component
// ==========================================

interface StrategySelectorProps {
  strategies: Strategy[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showDefault?: boolean;
}

export function StrategySelector({ 
  strategies, 
  selectedId, 
  onSelect,
  showDefault = true 
}: StrategySelectorProps) {
  const activeStrategies = strategies.filter(s => s.status === 'active');
  const defaultStrategy = strategies.find(s => s.isDefault);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">
        Strategy
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
      >
        <option value="">No Strategy (Manual)</option>
        {activeStrategies.map((strategy) => (
          <option key={strategy.id} value={strategy.id}>
            {strategy.name} {strategy.isDefault ? '⭐' : ''}
          </option>
        ))}
      </select>
      
      {showDefault && defaultStrategy && !selectedId && (
        <button
          type="button"
          onClick={() => onSelect(defaultStrategy.id)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Use default: {defaultStrategy.name}
        </button>
      )}
    </div>
  );
}

// ==========================================
// EXAMPLE 2: Compliance Checklist Component
// ==========================================

interface ComplianceChecklistProps {
  title: string;
  items: Array<{ id: string; text: string; weight?: number }>;
  checked: string[];
  onChange: (checkedIds: string[]) => void;
  color?: 'green' | 'blue' | 'red' | 'yellow';
}

export function ComplianceChecklist({
  title,
  items,
  checked,
  onChange,
  color = 'blue'
}: ComplianceChecklistProps) {
  const toggleItem = (id: string) => {
    if (checked.includes(id)) {
      onChange(checked.filter(cid => cid !== id));
    } else {
      onChange([...checked, id]);
    }
  };

  const colorClasses = {
    green: 'border-green-500/20 bg-green-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5'
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      <div className={`border rounded-lg p-3 space-y-2 ${colorClasses[color]}`}>
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={checked.includes(item.id)}
              onChange={() => toggleItem(item.id)}
              className="mt-1 rounded border-zinc-700 bg-zinc-900"
            />
            <div className="flex-1">
              <span className="text-sm text-zinc-300 group-hover:text-zinc-100">
                {item.text}
              </span>
              {item.weight && item.weight > 1 && (
                <span className="ml-2 text-xs text-zinc-500">
                  (Weight: {item.weight})
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// EXAMPLE 3: Compliance Badge Component
// ==========================================

export function ComplianceBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const getIcon = () => {
    if (score >= 80) return '✓';
    if (score >= 60) return '!';
    return '✗';
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${getColor()}`}>
      <span>{getIcon()}</span>
      <span>{score}%</span>
    </span>
  );
}

// ==========================================
// EXAMPLE 4: AI Insights Generator & Card
// ==========================================

interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'tip';
  title: string;
  message: string;
  metric?: string;
  action?: string;
}

export function generateAIInsights(
  strategy: Strategy,
  stats: StrategyStatistics
): AIInsight[] {
  const insights: AIInsight[] = [];

  // Low compliance warning
  if (stats.avgCompliancePct < 70) {
    insights.push({
      id: 'compliance-low',
      type: 'warning',
      title: 'Low Compliance Detected',
      message: `Your average compliance is ${stats.avgCompliancePct.toFixed(1)}%. This correlates with suboptimal performance. Focus on completing pre-entry checklists.`,
      metric: 'Compliance',
      action: 'Review strategy rules'
    });
  }

  // Session performance warning
  Object.entries(stats.bySession).forEach(([session, data]) => {
    if (data.count >= 5 && data.winRate < 40) {
      insights.push({
        id: `session-${session}`,
        type: 'warning',
        title: `${session} Session Underperformance`,
        message: `${session} session shows ${data.winRate.toFixed(1)}% win rate with ${formatR(data.netPnlR)} net. Consider avoiding this session or reviewing strategy adaptation.`,
        metric: `${session} Session`,
        action: `Filter trades by ${session} session`
      });
    }
  });

  // Target hit rate
  if (stats.actualRRUtilization < 40 && stats.totalTrades > 10) {
    insights.push({
      id: 'target-utilization',
      type: 'tip',
      title: 'Low Target Achievement',
      message: `Only ${stats.actualRRUtilization.toFixed(1)}% of trades reached ${stats.targetRR}R target. Review if targets are realistic or if exits are premature.`,
      metric: 'Target Hit Rate',
      action: 'Review exit criteria'
    });
  }

  // High compliance + good results
  if (stats.avgCompliancePct >= 80 && stats.winRate >= (strategy.winRateTargetPct || 50)) {
    insights.push({
      id: 'success-pattern',
      type: 'success',
      title: 'Excellent Discipline',
      message: `High compliance (${stats.avgCompliancePct.toFixed(1)}%) with ${stats.winRate.toFixed(1)}% win rate. Keep following your process!`,
      metric: 'Overall Performance'
    });
  }

  // Best/worst symbol
  const symbolEntries = Object.entries(stats.bySymbol);
  if (symbolEntries.length > 1) {
    const sorted = symbolEntries.sort((a, b) => b[1].netPnlR - a[1].netPnlR);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best[1].count >= 5 && worst[1].count >= 5) {
      insights.push({
        id: 'symbol-comparison',
        type: 'tip',
        title: 'Symbol Performance Variance',
        message: `${best[0]} performs best (${formatR(best[1].netPnlR)}, ${best[1].winRate.toFixed(1)}% WR) while ${worst[0]} struggles (${formatR(worst[1].netPnlR)}, ${worst[1].winRate.toFixed(1)}% WR). Consider specializing.`,
        metric: 'Symbol Selection',
        action: 'Focus on high-performing instruments'
      });
    }
  }

  return insights;
}

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  const icons = {
    success: '✅',
    warning: '⚠️',
    tip: '💡'
  };

  const colors = {
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    tip: 'border-blue-500/20 bg-blue-500/5'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[insight.type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icons[insight.type]}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-zinc-100 mb-1">{insight.title}</h4>
          <p className="text-sm text-zinc-300 mb-2">{insight.message}</p>
          {insight.metric && (
            <span className="text-xs text-zinc-500">Related: {insight.metric}</span>
          )}
          {insight.action && (
            <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
              {insight.action} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EXAMPLE 5: Strategy Comparison Table
// ==========================================

export function StrategyComparisonTable({ 
  strategies, 
  trades 
}: { 
  strategies: Strategy[]; 
  trades: Trade[]; 
}) {
  const statsMap = useMemo(() => {
    const map = new Map<string, StrategyStatistics>();
    strategies.forEach(strategy => {
      const stats = calculateStrategyStatistics(strategy, trades);
      map.set(strategy.id, stats);
    });
    return map;
  }, [strategies, trades]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left p-3 text-zinc-400">Strategy</th>
            <th className="text-right p-3 text-zinc-400">Trades</th>
            <th className="text-right p-3 text-zinc-400">Win Rate</th>
            <th className="text-right p-3 text-zinc-400">Expectancy</th>
            <th className="text-right p-3 text-zinc-400">Compliance</th>
            <th className="text-right p-3 text-zinc-400">Net R</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map(strategy => {
            const stats = statsMap.get(strategy.id);
            if (!stats) return null;

            return (
              <tr key={strategy.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                <td className="p-3">
                  <div>
                    <div className="font-medium text-zinc-100">{strategy.name}</div>
                    <div className="text-xs text-zinc-500">{strategy.tags.join(', ')}</div>
                  </div>
                </td>
                <td className="p-3 text-right text-zinc-300">{stats.totalTrades}</td>
                <td className="p-3 text-right">
                  <span className={stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                    {stats.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-zinc-300">
                  {formatR(stats.expectancyR)}
                </td>
                <td className="p-3 text-right">
                  <ComplianceBadge score={stats.avgCompliancePct} />
                </td>
                <td className="p-3 text-right">
                  <span className={stats.netPnlR >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatR(stats.netPnlR)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// EXAMPLE 6: Quick Strategy Stats Widget
// ==========================================

export function StrategyStatsWidget({ 
  strategy, 
  trades 
}: { 
  strategy: Strategy; 
  trades: Trade[]; 
}) {
  const stats = calculateStrategyStatistics(strategy, trades);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-100">{strategy.name}</h3>
        <ComplianceBadge score={stats.avgCompliancePct} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-zinc-100">{stats.totalTrades}</div>
          <div className="text-xs text-zinc-500">Trades</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.winRate.toFixed(0)}%
          </div>
          <div className="text-xs text-zinc-500">Win Rate</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${stats.netPnlR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatR(stats.netPnlR)}
          </div>
          <div className="text-xs text-zinc-500">Net R</div>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800 flex justify-between text-xs">
        <span className="text-zinc-500">Last trade:</span>
        <span className={stats.lastTradeResult === 'win' ? 'text-green-400' : 'text-red-400'}>
          {stats.lastTradeResult === 'win' ? '✓ Win' : '✗ Loss'}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// HELPER: Generate Trade ID
// ==========================================

export function generateTradeId(): string {
  return `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}