// src/components/onboarding/RiskSetupModal.tsx
// ✅ FIXED v8.4.4: Using new DB columns (portfolio_size, risk_percentage, risk_mode)
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TrendingUp, Percent, DollarSign } from 'lucide-react';

interface RiskSetupModalProps {
  open: boolean;
  onClose: () => void; // ✅ FIXED: Changed from onComplete to onClose
  userId: string;
}

type RiskMode = 'percentage' | 'fixed';

export default function RiskSetupModal({ open, onClose, userId }: RiskSetupModalProps) {
  const [portfolioSize, setPortfolioSize] = useState('10000');
  const [riskMode, setRiskMode] = useState<RiskMode>('percentage');
  const [riskPercentage, setRiskPercentage] = useState('1');
  const [fixedAmount, setFixedAmount] = useState('100');
  const [loading, setLoading] = useState(false);

  // Calculate risk value
  const calculateRiskValue = () => {
    const portfolio = parseFloat(portfolioSize) || 0;
    if (riskMode === 'percentage') {
      const percentage = parseFloat(riskPercentage) || 0;
      return (portfolio * percentage) / 100;
    } else {
      return parseFloat(fixedAmount) || 0;
    }
  };

  const riskValue = calculateRiskValue();

  const handleSave = async () => {
    if (!portfolioSize || parseFloat(portfolioSize) <= 0) {
      toast.error('Please enter a valid portfolio size');
      return;
    }

    if (riskMode === 'percentage') {
      const percentage = parseFloat(riskPercentage);
      if (!percentage || percentage <= 0 || percentage > 100) {
        toast.error('Please enter a valid risk percentage (0-100)');
        return;
      }
    } else {
      const amount = parseFloat(fixedAmount);
      if (!amount || amount <= 0) {
        toast.error('Please enter a valid fixed amount');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('💾 Saving risk settings for user:', userId);

      // 🔥 FIX: Build update object properly using NEW DB columns
      const updateData: any = {
        portfolio_size: parseFloat(portfolioSize),
        risk_mode: riskMode,
        updated_at: new Date().toISOString()
      };

      // Add risk values based on mode
      if (riskMode === 'percentage') {
        updateData.risk_percentage = parseFloat(riskPercentage);
        updateData.fixed_risk_amount = null;
      } else {
        updateData.fixed_risk_amount = parseFloat(fixedAmount);
        updateData.risk_percentage = null;
      }

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
      onClose(); // ✅ FIXED: Use onClose instead of onComplete
    } catch (error: any) {
      console.error('❌ Error saving risk settings:', error);
      toast.error(error.message || 'Failed to save risk settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.info('You can set your risk parameters later in Settings');
    onClose(); // ✅ FIXED: Use onClose instead of onComplete
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
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

        <div className="space-y-4 py-2">
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
                className="pl-9 bg-zinc-800 border-zinc-700 text-white h-10"
                placeholder="10000"
              />
            </div>
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
              Risk Per Trade (1R) <span className="text-zinc-500 text-xs">(% of portfolio)</span>
            </Label>
            {riskMode === 'percentage' ? (
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="number"
                  step="0.1"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white h-10"
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
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white h-10"
                  placeholder="100"
                />
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Recommended: 0.5% - 2% per trade
            </p>
          </div>

          {/* Risk Value Display */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-zinc-400">Your 1R Value</span>
            </div>
            <div className="text-3xl font-bold text-yellow-500 mb-2">
              ${riskValue.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-400 mb-3">
              {riskMode === 'percentage' ? `${riskPercentage}% of $${portfolioSize}` : `Fixed $${fixedAmount} per trade`}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-zinc-400 mb-1">Example Trades</div>
              <div className="flex justify-between">
                <span className="text-zinc-500">+2R Win:</span>
                <span className="text-green-500 font-semibold">+${(riskValue * 2).toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">-1R Loss:</span>
                <span className="text-red-500 font-semibold">-${riskValue.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">+3.5R Win:</span>
                <span className="text-green-500 font-semibold">+${(riskValue * 3.5).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={loading}
              className="flex-1 border-zinc-700 hover:bg-zinc-800 h-10"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-600 hover:to-yellow-700 h-10"
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