// ui/PositionsPanel.tsx - COMPLETE FIXED VERSION
import React from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { Theme, Position, sideToPositionSide } from '../types';  // ✅ הוסף import
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatPrice, formatPnL, formatDate, formatSide } from '../utils/formatting';

export interface PositionsPanelProps {
  positions: Position[];
  theme: Theme;
  onClose?: () => void;
  onClosePosition?: (id: string) => void;
  onModifySL?: (id: string, newSL: number) => void;
  onModifyTP?: (id: string, newTP: number) => void;
  className?: string;
}

export const PositionsPanel: React.FC<PositionsPanelProps> = ({
  positions,
  theme,
  onClose,
  onClosePosition,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const totalUnrealizedPnL = positions.reduce(
    (sum, p) => sum + (p.unrealizedPnL || p.unrealizedPnl || 0),
    0
  );

  return (
    <div
      className={cn(
        'absolute top-20 right-4 z-20 backdrop-blur-md rounded-lg border w-[400px] max-h-[60vh] overflow-hidden flex flex-col',
        isDark
          ? 'bg-black/90 border-[#C9A646]/30'
          : 'bg-white/90 border-gray-200',
        className
      )}
    >
      <div className="p-4 border-b border-current/10 flex items-center justify-between">
        <div>
          <h3
            className={cn(
              'text-base font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            Open Positions ({positions.length})
          </h3>
          <p className="text-xs mt-1">
            <span
              className={cn(
                isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
              )}
            >
              Total P&L:{' '}
            </span>
            <span
              className={cn(
                'font-medium',
                totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {formatPnL(totalUnrealizedPnL, 2).text}
            </span>
          </p>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {positions.length === 0 ? (
          <div
            className={cn(
              'text-center py-8 text-sm',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            No open positions
          </div>
        ) : (
          positions.map(position => {
            const pnl = formatPnL(position.unrealizedPnL || position.unrealizedPnl || 0, 2);
            
            // ✅ Convert Side enum to string for comparison
            const positionSide = sideToPositionSide(position.side);

            return (
              <div
                key={position.positionId}  // ✅ Use positionId
                className={cn(
                  'rounded-lg border p-3',
                  isDark
                    ? 'bg-black/40 border-[#C9A646]/20'
                    : 'bg-gray-50 border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-6 w-6 rounded flex items-center justify-center text-xs font-bold',
                        positionSide === 'long'  // ✅ Compare strings
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      )}
                    >
                      {positionSide === 'long' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'font-semibold',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {position.symbol}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded',
                        positionSide === 'long'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      )}
                    >
                      {positionSide.toUpperCase()}
                    </span>
                  </div>
                  <span className={pnl.colorClass}>{pnl.text}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                      )}
                    >
                      Size:
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {position.size}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                      )}
                    >
                      Entry:
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {formatPrice(position.entryPrice, 2, '$')}
                    </span>
                  </div>

                  {position.exitPrice && (
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                        )}
                      >
                        Exit:
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          isDark ? 'text-white' : 'text-gray-900'
                        )}
                      >
                        {formatPrice(position.exitPrice, 2, '$')}
                      </span>
                    </div>
                  )}

                  {position.stopLoss && (
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                        )}
                      >
                        Stop Loss:
                      </span>
                      <span className="font-medium text-red-600">
                        {formatPrice(position.stopLoss, 2, '$')}
                      </span>
                    </div>
                  )}

                  {position.takeProfit && (
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                        )}
                      >
                        Take Profit:
                      </span>
                      <span className="font-medium text-green-600">
                        {formatPrice(position.takeProfit, 2, '$')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                      )}
                    >
                      Opened:
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {formatDate(position.entryTime as number, false)}
                    </span>
                  </div>
                </div>

                {onClosePosition && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <Button
                      size="sm"
                      onClick={() => onClosePosition(position.positionId)}  // ✅ Use positionId
                      className={cn(
                        'w-full h-8 text-xs',
                        isDark
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                      )}
                    >
                      Close Position
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};