// trading/BacktestPanel.tsx
import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import { Theme, BacktestStatistics } from '../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatPrice, formatPercentage } from '../utils/formatting';

// ✅ Export interface
export interface BacktestPanelProps {
  stats: BacktestStatistics;
  initialBalance: number;
  currentBalance: number;
  theme: Theme;
  onClose?: () => void;
  className?: string;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({
  stats,
  initialBalance,
  currentBalance,
  theme,
  onClose,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    valueColor?: string;
    subtitle?: string;
  }> = ({ icon, label, value, valueColor, subtitle }) => (
    <div
      className={cn(
        'rounded-lg border p-4',
        isDark ? 'bg-black/40 border-[#C9A646]/20' : 'bg-gray-50 border-gray-200'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            isDark ? 'bg-[#C9A646]/10' : 'bg-blue-100'
          )}
        >
          {icon}
        </div>
        <span
          className={cn(
            'text-sm font-medium',
            isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          'text-2xl font-bold',
          valueColor || (isDark ? 'text-white' : 'text-gray-900')
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div
          className={cn(
            'text-xs mt-1',
            isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'absolute bottom-16 left-4 right-4 z-20 backdrop-blur-md rounded-lg border p-6 max-h-[60vh] overflow-y-auto',
        isDark
          ? 'bg-black/90 border-[#C9A646]/30'
          : 'bg-white/90 border-gray-200',
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              isDark ? 'bg-[#C9A646]/10' : 'bg-blue-100'
            )}
          >
            <BarChart3
              className={cn(
                'h-5 w-5',
                isDark ? 'text-[#C9A646]' : 'text-blue-600'
              )}
            />
          </div>
          <div>
            <h3
              className={cn(
                'text-lg font-semibold',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              Backtest Results
            </h3>
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
              )}
            >
              Performance summary and statistics
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className={cn(
              'h-8 w-8 p-0',
              isDark
                ? 'hover:bg-[#C9A646]/10 text-[#C9A646]'
                : 'hover:bg-gray-100'
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<span className="text-[#C9A646]">$</span>}
          label="Total P&L"
          value={formatPrice(stats.totalPnl, 2, '$')}
          valueColor={stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}
          subtitle={`${formatPercentage(stats.totalPnlPercent, 2)} ROI`}
        />

        <StatCard
          icon={<span className="text-[#C9A646]">%</span>}
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          valueColor={stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}
          subtitle={`${stats.winningTrades}W / ${stats.losingTrades}L`}
        />

        <StatCard
          icon={<span className="text-[#C9A646]">#</span>}
          label="Total Trades"
          value={stats.totalTrades}
          subtitle={`Profit Factor: ${stats.profitFactor.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4
            className={cn(
              'text-sm font-semibold mb-3',
              isDark ? 'text-[#C9A646]' : 'text-gray-700'
            )}
          >
            Profit Statistics
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Gross Profit
              </span>
              <span className="text-sm font-medium text-green-600">
                {formatPrice(stats.grossProfit, 2, '$')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Gross Loss
              </span>
              <span className="text-sm font-medium text-red-600">
                {formatPrice(stats.grossLoss, 2, '$')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Avg Win
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {formatPrice(stats.avgWin, 2, '$')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Avg Loss
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {formatPrice(stats.avgLoss, 2, '$')}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4
            className={cn(
              'text-sm font-semibold mb-3',
              isDark ? 'text-[#C9A646]' : 'text-gray-700'
            )}
          >
            Risk Statistics
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Max Drawdown
              </span>
              <span className="text-sm font-medium text-red-600">
                {stats.maxDrawdownPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Profit Factor
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {stats.profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Initial Balance
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {formatPrice(initialBalance, 2, '$')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Final Balance
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  currentBalance >= initialBalance
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {formatPrice(currentBalance, 2, '$')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-current/10">
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              'text-sm font-medium',
              isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
            )}
          >
            Win vs Loss Ratio
          </span>
          <span
            className={cn(
              'text-sm font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {stats.winningTrades} / {stats.losingTrades}
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className="bg-green-600 transition-all"
            style={{
              width: `${
                stats.totalTrades > 0
                  ? (stats.winningTrades / stats.totalTrades) * 100
                  : 0
              }%`,
            }}
          />
          <div
            className="bg-red-600 transition-all"
            style={{
              width: `${
                stats.totalTrades > 0
                  ? (stats.losingTrades / stats.totalTrades) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};