// ================================================
// MULTIPLE EXITS COMPONENT - Partial Exits / Scale Out
// ================================================
// Allows users to add multiple exit points with different quantities
// Calculates weighted average exit price automatically
// ================================================

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Percent, DollarSign, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber } from '@/utils/smartCalc';

export interface ExitPoint {
  id: string;
  quantity: number;
  price: number;
  percentage?: number; // % of total position
  pnl?: number;        // P&L for this exit
}

interface MultipleExitsProps {
  totalQuantity: number;
  entryPrice: number;
  side: 'LONG' | 'SHORT';
  multiplier: number;
  fees: number;
  exits: ExitPoint[];
  onExitsChange: (exits: ExitPoint[]) => void;
  disabled?: boolean;
}

export function MultipleExits({
  totalQuantity,
  entryPrice,
  side,
  multiplier,
  fees,
  exits,
  onExitsChange,
  disabled = false,
}: MultipleExitsProps) {
  
  // Generate unique ID
  const generateId = () => `exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate remaining quantity
  const exitedQuantity = useMemo(() => 
    exits.reduce((sum, e) => sum + (e.quantity || 0), 0),
    [exits]
  );
  
  const remainingQuantity = totalQuantity - exitedQuantity;
  const remainingPercentage = totalQuantity > 0 ? (remainingQuantity / totalQuantity) * 100 : 100;

  // Calculate weighted average exit price
  const weightedAveragePrice = useMemo(() => {
    if (exits.length === 0 || exitedQuantity === 0) return 0;
    
    const weightedSum = exits.reduce((sum, e) => sum + (e.price * e.quantity), 0);
    return weightedSum / exitedQuantity;
  }, [exits, exitedQuantity]);

  // Calculate total P&L
  const totalPnL = useMemo(() => {
    if (exits.length === 0 || !entryPrice) return 0;
    
    return exits.reduce((total, exit) => {
      if (!exit.price || !exit.quantity) return total;
      
      const priceChange = side === 'LONG' 
        ? exit.price - entryPrice 
        : entryPrice - exit.price;
      
      const grossPnL = priceChange * exit.quantity * multiplier;
      return total + grossPnL;
    }, 0) - fees;
  }, [exits, entryPrice, side, multiplier, fees]);

  // Calculate P&L for each exit
  const exitsWithPnL = useMemo(() => {
    return exits.map(exit => {
      if (!exit.price || !exit.quantity || !entryPrice) {
        return { ...exit, pnl: 0, percentage: 0 };
      }
      
      const priceChange = side === 'LONG' 
        ? exit.price - entryPrice 
        : entryPrice - exit.price;
      
      const pnl = priceChange * exit.quantity * multiplier;
      const percentage = totalQuantity > 0 ? (exit.quantity / totalQuantity) * 100 : 0;
      
      return { ...exit, pnl, percentage };
    });
  }, [exits, entryPrice, side, multiplier, totalQuantity]);

  // Add new exit
  const addExit = () => {
    if (remainingQuantity <= 0) return;
    
    const newExit: ExitPoint = {
      id: generateId(),
      quantity: remainingQuantity,
      price: 0,
    };
    
    onExitsChange([...exits, newExit]);
  };

  // Update exit
  const updateExit = (id: string, field: 'quantity' | 'price', value: number) => {
    const updated = exits.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value };
      }
      return e;
    });
    onExitsChange(updated);
  };

  // Remove exit
  const removeExit = (id: string) => {
    onExitsChange(exits.filter(e => e.id !== id));
  };

  // Set exit by percentage
  const setExitByPercentage = (id: string, percentage: number) => {
    const quantity = (totalQuantity * percentage) / 100;
    updateExit(id, 'quantity', Math.round(quantity * 100) / 100);
  };

  // Quick percentage buttons
  const quickPercentages = [25, 50, 75, 100];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-zinc-400 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          יציאות (Partial Exits)
        </Label>
        <div className="text-xs text-zinc-500">
          נותר: <span className="text-yellow-400 font-medium">{formatNumber(remainingQuantity, 2)}</span>
          <span className="text-zinc-600 mx-1">|</span>
          {formatNumber(remainingPercentage, 0)}%
        </div>
      </div>

      {/* Exits List */}
      <div className="space-y-3">
        {exitsWithPnL.map((exit, index) => (
          <div 
            key={exit.id}
            className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 space-y-3"
          >
            {/* Exit Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                יציאה #{index + 1}
                {exit.percentage && exit.percentage > 0 && (
                  <span className="ml-2 text-yellow-400">
                    ({formatNumber(exit.percentage, 0)}%)
                  </span>
                )}
              </span>
              
              {exits.length > 1 && !disabled && (
                <button
                  type="button"
                  onClick={() => removeExit(exit.id)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500 hover:text-red-400" />
                </button>
              )}
            </div>

            {/* Quick Percentage Buttons */}
            {!disabled && (
              <div className="flex gap-2">
                {quickPercentages.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setExitByPercentage(exit.id, pct)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      Math.abs((exit.percentage || 0) - pct) < 1
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}

            {/* Quantity & Price Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-zinc-500 mb-1 block">כמות</Label>
                <Input
                  type="number"
                  step="any"
                  value={exit.quantity || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) updateExit(exit.id, 'quantity', val);
                  }}
                  disabled={disabled}
                  placeholder="0"
                  className="bg-zinc-950 border-zinc-800 h-10 text-right text-sm"
                />
              </div>
              
              <div>
                <Label className="text-[10px] text-zinc-500 mb-1 block">מחיר יציאה</Label>
                <Input
                  type="number"
                  step="any"
                  value={exit.price || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) updateExit(exit.id, 'price', val);
                  }}
                  disabled={disabled}
                  placeholder="0.00"
                  className="bg-zinc-950 border-zinc-800 h-10 text-right text-sm"
                />
              </div>
            </div>

            {/* Exit P&L */}
            {exit.price > 0 && exit.quantity > 0 && (
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                (exit.pnl || 0) >= 0 
                  ? 'bg-emerald-500/10 border border-emerald-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <span className="text-xs text-zinc-400">P&L יציאה זו:</span>
                <span className={`text-sm font-bold ${
                  (exit.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(exit.pnl || 0) >= 0 ? '+' : ''}${formatNumber(exit.pnl || 0, 2)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Exit Button */}
      {remainingQuantity > 0 && !disabled && (
        <button
          type="button"
          onClick={addExit}
          className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-700 hover:border-yellow-500/40 text-zinc-400 hover:text-yellow-400 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">הוסף יציאה נוספת</span>
        </button>
      )}

      {/* Summary */}
      {exits.length > 0 && exitedQuantity > 0 && (
        <div className="mt-6 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl p-5 border border-yellow-200/20">
          <h4 className="text-xs font-medium text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            סיכום יציאות
          </h4>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Total Exited */}
            <div className="text-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="text-[10px] text-zinc-500 mb-1">יצאו מהפוזיציה</div>
              <div className="text-lg font-bold text-white">
                {formatNumber(exitedQuantity, 2)}
              </div>
              <div className="text-[10px] text-zinc-600">
                {formatNumber((exitedQuantity / totalQuantity) * 100, 0)}% מהכמות
              </div>
            </div>

            {/* Weighted Average Price */}
            <div className="text-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="text-[10px] text-zinc-500 mb-1">מחיר ממוצע משוקלל</div>
              <div className="text-lg font-bold text-yellow-400">
                ${formatNumber(weightedAveragePrice, 4)}
              </div>
              <div className="text-[10px] text-zinc-600">
                {side === 'LONG' 
                  ? weightedAveragePrice > entryPrice ? '↑' : '↓'
                  : weightedAveragePrice < entryPrice ? '↑' : '↓'
                } מהכניסה
              </div>
            </div>

            {/* Total P&L */}
            <div className={`text-center p-3 rounded-lg border ${
              totalPnL >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="text-[10px] text-zinc-500 mb-1">P&L כולל</div>
              <div className={`text-lg font-bold ${
                totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {totalPnL >= 0 ? '+' : ''}${formatNumber(totalPnL, 2)}
              </div>
              <div className={`text-[10px] ${
                totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {totalPnL >= 0 ? 'רווח' : 'הפסד'}
              </div>
            </div>
          </div>

          {/* Position Status */}
          {remainingQuantity > 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <div className="flex items-center gap-2 text-yellow-400 text-xs">
                <TrendingUp className="w-4 h-4" />
                <span>
                  פוזיציה פתוחה: <span className="font-bold">{formatNumber(remainingQuantity, 2)}</span> נותרו
                  ({formatNumber(remainingPercentage, 0)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Calculate weighted average exit price from multiple exits
 */
export function calculateWeightedAverageExit(exits: ExitPoint[]): number {
  const totalQuantity = exits.reduce((sum, e) => sum + (e.quantity || 0), 0);
  if (totalQuantity === 0) return 0;
  
  const weightedSum = exits.reduce((sum, e) => sum + (e.price * e.quantity), 0);
  return weightedSum / totalQuantity;
}

/**
 * Calculate total P&L from multiple exits
 */
export function calculateTotalPnL(
  exits: ExitPoint[],
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  multiplier: number,
  fees: number
): number {
  if (exits.length === 0 || !entryPrice) return 0;
  
  const grossPnL = exits.reduce((total, exit) => {
    if (!exit.price || !exit.quantity) return total;
    
    const priceChange = side === 'LONG' 
      ? exit.price - entryPrice 
      : entryPrice - exit.price;
    
    return total + (priceChange * exit.quantity * multiplier);
  }, 0);
  
  return grossPnL - fees;
}

/**
 * Prepare exits data for saving to metrics JSONB
 */
export function prepareExitsForSave(exits: ExitPoint[]): {
  exits: ExitPoint[];
  weighted_average_price: number;
  total_exited_quantity: number;
} {
  return {
    exits: exits.filter(e => e.price > 0 && e.quantity > 0),
    weighted_average_price: calculateWeightedAverageExit(exits),
    total_exited_quantity: exits.reduce((sum, e) => sum + (e.quantity || 0), 0),
  };
}

export default MultipleExits;