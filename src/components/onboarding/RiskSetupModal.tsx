// src/components/onboarding/RiskSetupModal.tsx
// =====================================================
// FINOTAUR RISK SETUP MODAL - UNIFIED v9.0
// =====================================================
// ✅ Synced with RiskSettingsDialog & useRiskSettings
// ✅ Saves ALL required DB columns
// ✅ Works for ALL plans (Free, Basic, Premium)
// =====================================================

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TrendingUp, Percent, DollarSign, AlertCircle, Info } from 'lucide-react';
import { formatNumber } from '@/utils/smartCalc';

interface RiskSetupModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type RiskMode = 'percentage' | 'fixed';

export default function RiskSetupModal({ open, onClose, userId }: RiskSetupModalProps) {
  const [portfolioSize, setPortfolioSize] = useState('10000');
  const [riskMode, setRiskMode] = useState<RiskMode>('percentage');
  const [riskPercentage, setRiskPercentage] = useState('1');
  const [fixedAmount, setFixedAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setPortfolioSize('10000');
      setRiskMode('percentage');
      setRiskPercentage('1');
      setFixedAmount('100');
      setErrors({});
    }
  }, [open]);

  // Calculate 1R value
  const riskValue = useMemo(() => {
    const portfolio = parseFloat(portfolioSize) || 0;
    if (riskMode === 'percentage') {
      const percentage = parseFloat(riskPercentage) || 0;
      return (portfolio * percentage) / 100;
    } else {
      return parseFloat(fixedAmount) || 0;
    }
  }, [portfolioSize, riskMode, riskPercentage, fixedAmount]);

  // Validation
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const portfolio = parseFloat(portfolioSize);
    
    if (!portfolio || portfolio <= 0) {
      newErrors.portfolioSize = 'Please enter a valid portfolio size';
    }

    if (riskMode === 'percentage') {
      const percentage = parseFloat(riskPercentage);
      if (!percentage || percentage <= 0) {
        newErrors.riskPerTrade = 'Please enter a valid risk percentage';
      } else if (percentage > 100) {
        newErrors.riskPerTrade = 'Risk cannot exceed 100%';
      } else if (percentage > 10) {
        newErrors.riskPerTrade = 'Risk > 10% is extremely dangerous!';
      }
    } else {
      const amount = parseFloat(fixedAmount);
      if (!amount || amount <= 0) {
        newErrors.riskPerTrade = 'Please enter a valid fixed amount';
      } else if (amount > portfolio * 0.1) {
        newErrors.riskPerTrade = 'Risk per trade should not exceed 10% of portfolio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('💾 Saving risk settings for user:', userId);

      const portfolioValue = parseFloat(portfolioSize);
      const riskPerTradeValue = riskMode === 'percentage' 
        ? parseFloat(riskPercentage) 
        : parseFloat(fixedAmount);

      // 🔥 UNIFIED: Save ALL fields that useRiskSettings expects
      const updateData: Record<string, any> = {
        // Core risk settings
        portfolio_size: portfolioValue,
        risk_mode: riskMode,
        
        // Risk values based on mode
        risk_percentage: riskMode === 'percentage' ? riskPerTradeValue : null,
        fixed_risk_amount: riskMode === 'fixed' ? riskPerTradeValue : null,
        
        // 🔥 IMPORTANT: Also set initial/current portfolio for ROI tracking
        initial_portfolio: portfolioValue,
        current_portfolio: portfolioValue,
        total_pnl: 0, // Start fresh
        
        updated_at: new Date().toISOString()
      };

      console.log('📊 Update data:', updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Risk settings saved successfully');
      toast.success('Risk settings saved!');
      onClose();
    } catch (error: any) {
      console.error('❌ Error saving risk settings:', error);
      toast.error(error.message || 'Failed to save risk settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.info('You can set your risk parameters later in Settings');
    onClose();
  };

  // Check for high risk warning
  const isHighRisk = useMemo(() => {
    if (riskMode === 'percentage') {
      return parseFloat(riskPercentage) > 5;
    } else {
      const portfolio = parseFloat(portfolioSize) || 1;
      return parseFloat(fixedAmount) > portfolio * 0.05;
    }
  }, [riskMode, riskPercentage, fixedAmount, portfolioSize]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-yellow-500" />
            <DialogTitle className="text-xl font-bold">
              Set Your Trade Risk
            </DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            Define your risk parameters to calculate your 1R (risk per trade)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Portfolio Size */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">
              Portfolio Size <span className="text-zinc-500 text-xs">(Total account value)</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="number"
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(e.target.value)}
                className={`pl-9 bg-zinc-800 border-zinc-700 text-white h-11 text-lg font-semibold ${
                  errors.portfolioSize ? 'border-red-500' : ''
                }`}
                placeholder="10000"
              />
            </div>
            {errors.portfolioSize && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.portfolioSize}
              </p>
            )}
          </div>

          {/* Risk Calculation Mode */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Risk Calculation Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRiskMode('percentage')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  riskMode === 'percentage'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <Percent className={`w-5 h-5 mx-auto mb-1 ${
                  riskMode === 'percentage' ? 'text-yellow-500' : 'text-zinc-500'
                }`} />
                <div className="text-sm font-semibold">Percentage</div>
                <div className="text-xs text-zinc-500">% of portfolio</div>
              </button>

              <button
                onClick={() => setRiskMode('fixed')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  riskMode === 'fixed'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <DollarSign className={`w-5 h-5 mx-auto mb-1 ${
                  riskMode === 'fixed' ? 'text-yellow-500' : 'text-zinc-500'
                }`} />
                <div className="text-sm font-semibold">Fixed Amount</div>
                <div className="text-xs text-zinc-500">Fixed $ per trade</div>
              </button>
            </div>
          </div>

          {/* Risk Per Trade */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">
              Risk Per Trade (1R){' '}
              <span className="text-zinc-500 text-xs">
                ({riskMode === 'percentage' ? '% of portfolio' : 'Fixed dollar amount'})
              </span>
            </Label>
            {riskMode === 'percentage' ? (
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="number"
                  step="0.1"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(e.target.value)}
                  className={`pl-9 bg-zinc-800 border-zinc-700 text-white h-11 text-lg font-semibold ${
                    errors.riskPerTrade ? 'border-red-500' : ''
                  }`}
                  placeholder="1"
                />
              </div>
            ) : (
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  className={`pl-9 bg-zinc-800 border-zinc-700 text-white h-11 text-lg font-semibold ${
                    errors.riskPerTrade ? 'border-red-500' : ''
                  }`}
                  placeholder="100"
                />
              </div>
            )}
            {errors.riskPerTrade ? (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.riskPerTrade}
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                {riskMode === 'percentage' 
                  ? 'Recommended: 0.5% - 2% per trade'
                  : 'Recommended: Keep under 10% of portfolio'
                }
              </p>
            )}
          </div>

          {/* High Risk Warning */}
          {isHighRisk && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-semibold">High Risk Warning</p>
                  <p className="text-red-400/80 text-xs">
                    Professional traders typically risk 1-2% per trade.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Risk Value Display */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-zinc-400">Your 1R Value</span>
            </div>
            <div className="text-3xl font-bold text-yellow-500 mb-2">
              ${formatNumber(riskValue, 2)}
            </div>
            <div className="text-xs text-zinc-400 mb-3">
              {riskMode === 'percentage' 
                ? `${riskPercentage}% of $${formatNumber(parseFloat(portfolioSize) || 0, 0)}` 
                : `Fixed $${fixedAmount} per trade`
              }
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-zinc-400 mb-1">Example Trades</div>
              <div className="flex justify-between">
                <span className="text-zinc-500">+2R Win:</span>
                <span className="text-green-500 font-semibold">+${formatNumber(riskValue * 2, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">-1R Loss:</span>
                <span className="text-red-500 font-semibold">-${formatNumber(riskValue, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">+3.5R Win:</span>
                <span className="text-yellow-400 font-semibold">+${formatNumber(riskValue * 3.5, 0)}</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400 leading-relaxed">
                <span className="font-semibold">1R</span> represents your risk per trade. 
                This helps measure performance consistently. You can change these settings anytime in Settings.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={loading}
              className="flex-1 border-zinc-700 hover:bg-zinc-800 h-11"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-600 hover:to-yellow-700 h-11"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}