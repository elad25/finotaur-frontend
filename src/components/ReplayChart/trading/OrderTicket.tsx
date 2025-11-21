// trading/OrderTicket.tsx - WITH CORRECT TYPES
import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Theme, PositionSide, OrderTypeUI } from '../types'; // ✅ Use UI types
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export interface OrderTicketProps {
  symbol: string;
  currentPrice: number;
  theme: Theme;
  onSubmit: (order: {
    side: PositionSide;     // ✅ 'long' | 'short'
    type: OrderTypeUI;      // ✅ 'market' | 'limit'
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  onClose: () => void;
  className?: string;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  symbol,
  currentPrice,
  theme,
  onSubmit,
  onClose,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const [side, setSide] = useState<PositionSide>('long');
  const [orderType, setOrderType] = useState<OrderTypeUI>('market'); // ✅ Use UI type
  const [quantity, setQuantity] = useState<string>('1');
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toFixed(2));
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [takeProfit, setTakeProfit] = useState<string>('');

  const handleSubmit = () => {
    const order = {
      side,
      type: orderType,
      quantity: parseFloat(quantity),
      price: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
      stopLoss: useStopLoss && stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: useTakeProfit && takeProfit ? parseFloat(takeProfit) : undefined,
    };

    onSubmit(order);
    onClose();
  };

  const calculateEstimatedCost = () => {
    const price = orderType === 'market' ? currentPrice : parseFloat(limitPrice) || 0;
    return price * parseFloat(quantity || '0');
  };

  const calculatePotentialProfit = () => {
    if (!useTakeProfit || !takeProfit) return 0;
    const entryPrice = orderType === 'market' ? currentPrice : parseFloat(limitPrice) || 0;
    const tp = parseFloat(takeProfit);
    const qty = parseFloat(quantity || '0');
    
    if (side === 'long') {
      return (tp - entryPrice) * qty;
    } else {
      return (entryPrice - tp) * qty;
    }
  };

  const calculatePotentialLoss = () => {
    if (!useStopLoss || !stopLoss) return 0;
    const entryPrice = orderType === 'market' ? currentPrice : parseFloat(limitPrice) || 0;
    const sl = parseFloat(stopLoss);
    const qty = parseFloat(quantity || '0');
    
    if (side === 'long') {
      return (sl - entryPrice) * qty;
    } else {
      return (entryPrice - sl) * qty;
    }
  };

  const isValid = () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return false;
    
    if (orderType === 'limit') {
      const price = parseFloat(limitPrice);
      if (!price || price <= 0) return false;
    }

    return true;
  };

  return (
    <div
      className={cn(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 backdrop-blur-md rounded-lg border w-[450px] max-h-[90vh] overflow-y-auto',
        isDark
          ? 'bg-black/95 border-[#C9A646]/30'
          : 'bg-white/95 border-gray-200',
        className
      )}
    >
      <div className="p-6 border-b border-current/10">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={cn(
                'text-xl font-semibold',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              New Order
            </h3>
            <p
              className={cn(
                'text-sm mt-1',
                isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
              )}
            >
              {symbol} @ ${currentPrice.toFixed(2)}
            </p>
          </div>
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
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <Label
            className={cn(
              'text-sm font-medium mb-3 block',
              isDark ? 'text-[#C9A646]' : 'text-gray-700'
            )}
          >
            Side
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setSide('long')}
              className={cn(
                'h-12 gap-2 font-semibold',
                side === 'long'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : isDark
                  ? 'bg-black/40 hover:bg-black/60 text-[#C9A646] border border-[#C9A646]/20'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              <TrendingUp className="h-4 w-4" />
              Long / Buy
            </Button>
            <Button
              onClick={() => setSide('short')}
              className={cn(
                'h-12 gap-2 font-semibold',
                side === 'short'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isDark
                  ? 'bg-black/40 hover:bg-black/60 text-[#C9A646] border border-[#C9A646]/20'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              <TrendingDown className="h-4 w-4" />
              Short / Sell
            </Button>
          </div>
        </div>

        <div>
          <Label
            htmlFor="orderType"
            className={cn(
              'text-sm font-medium mb-2 block',
              isDark ? 'text-[#C9A646]' : 'text-gray-700'
            )}
          >
            Order Type
          </Label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderTypeUI)}>
            <SelectTrigger
              className={cn(
                'h-11',
                isDark
                  ? 'bg-black/40 border-[#C9A646]/20 text-white'
                  : 'bg-white border-gray-200'
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={cn(
                isDark ? 'bg-black border-[#C9A646]/30' : 'bg-white border-gray-200'
              )}
            >
              <SelectItem value="market">Market Order</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label
            htmlFor="quantity"
            className={cn(
              'text-sm font-medium mb-2 block',
              isDark ? 'text-[#C9A646]' : 'text-gray-700'
            )}
          >
            Quantity
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={cn(
              'h-11',
              isDark
                ? 'bg-black/40 border-[#C9A646]/20 text-white'
                : 'bg-white border-gray-200'
            )}
            placeholder="Enter quantity"
          />
        </div>

        {orderType === 'limit' && (
          <div>
            <Label
              htmlFor="limitPrice"
              className={cn(
                'text-sm font-medium mb-2 block',
                isDark ? 'text-[#C9A646]' : 'text-gray-700'
              )}
            >
              Limit Price
            </Label>
            <Input
              id="limitPrice"
              type="number"
              step="0.01"
              min="0"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className={cn(
                'h-11',
                isDark
                  ? 'bg-black/40 border-[#C9A646]/20 text-white'
                  : 'bg-white border-gray-200'
              )}
              placeholder="Enter price"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label
              className={cn(
                'text-sm font-medium',
                isDark ? 'text-[#C9A646]' : 'text-gray-700'
              )}
            >
              Stop Loss
            </Label>
            <Switch
              checked={useStopLoss}
              onCheckedChange={setUseStopLoss}
            />
          </div>
          {useStopLoss && (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className={cn(
                'h-11',
                isDark
                  ? 'bg-black/40 border-[#C9A646]/20 text-white'
                  : 'bg-white border-gray-200'
              )}
              placeholder="Enter stop loss price"
            />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label
              className={cn(
                'text-sm font-medium',
                isDark ? 'text-[#C9A646]' : 'text-gray-700'
              )}
            >
              Take Profit
            </Label>
            <Switch
              checked={useTakeProfit}
              onCheckedChange={setUseTakeProfit}
            />
          </div>
          {useTakeProfit && (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className={cn(
                'h-11',
                isDark
                  ? 'bg-black/40 border-[#C9A646]/20 text-white'
                  : 'bg-white border-gray-200'
              )}
              placeholder="Enter take profit price"
            />
          )}
        </div>

        <div
          className={cn(
            'rounded-lg border p-4 space-y-2',
            isDark
              ? 'bg-black/40 border-[#C9A646]/20'
              : 'bg-gray-50 border-gray-200'
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span
              className={cn(
                isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
              )}
            >
              Estimated Cost:
            </span>
            <span
              className={cn(
                'font-medium',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              ${calculateEstimatedCost().toFixed(2)}
            </span>
          </div>

          {useTakeProfit && takeProfit && (
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn(
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Potential Profit:
              </span>
              <span className="font-medium text-green-600">
                +${calculatePotentialProfit().toFixed(2)}
              </span>
            </div>
          )}

          {useStopLoss && stopLoss && (
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn(
                  isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
                )}
              >
                Potential Loss:
              </span>
              <span className="font-medium text-red-600">
                ${calculatePotentialLoss().toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {!isValid() && (
          <div
            className={cn(
              'rounded-lg border p-3 flex items-start gap-2 text-sm',
              isDark
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            )}
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Please enter valid order details</span>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-current/10 flex gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          className={cn(
            'flex-1 h-11',
            isDark
              ? 'hover:bg-[#C9A646]/10 text-[#C9A646]'
              : 'hover:bg-gray-100'
          )}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid()}
          className={cn(
            'flex-1 h-11 font-semibold',
            side === 'long'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Place {side === 'long' ? 'Buy' : 'Sell'} Order
        </Button>
      </div>
    </div>
  );
};