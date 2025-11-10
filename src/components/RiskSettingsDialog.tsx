import { useState, useEffect } from 'react';
import { X, DollarSign, Percent, AlertCircle, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { formatNumber } from '@/utils/smartCalc';
import { useRiskSettings } from '@/hooks/useRiskSettings';

interface RiskSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type RiskMode = 'percentage' | 'fixed';

interface FormSettings {
  portfolioSize: number;
  riskMode: RiskMode;
  riskPerTrade: number;
}

export default function RiskSettingsDialog({ open, onClose }: RiskSettingsDialogProps) {
  // ✅ Single hook instead of manual queries
  const { settings, calculate1R, updateSettings, isUpdating } = useRiskSettings();

  const [formSettings, setFormSettings] = useState<FormSettings>({
    portfolioSize: 10000,
    riskMode: 'percentage',
    riskPerTrade: 1,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // ✅ Load from hook when dialog opens
  useEffect(() => {
    if (open && settings) {
      setFormSettings({
        portfolioSize: settings.portfolioSize,
        riskMode: settings.riskMode,
        riskPerTrade: settings.riskPerTrade,
      });
      setErrors({});
    }
  }, [open, settings]);

  // Calculate 1R value
  const calculated1R = calculate1R(
    formSettings.portfolioSize,
    formSettings.riskMode,
    formSettings.riskPerTrade
  );

  // Validate
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (formSettings.portfolioSize <= 0) {
      newErrors.portfolioSize = 'Portfolio size must be positive';
    }

    if (formSettings.riskPerTrade <= 0) {
      newErrors.riskPerTrade = 'Risk per trade must be positive';
    }

    if (formSettings.riskMode === 'percentage' && formSettings.riskPerTrade > 10) {
      newErrors.riskPerTrade = 'Risk > 10% is extremely dangerous!';
    }

    if (
      formSettings.riskMode === 'fixed' &&
      formSettings.riskPerTrade > formSettings.portfolioSize * 0.1
    ) {
      newErrors.riskPerTrade = 'Risk per trade should not exceed 10% of portfolio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // ✅ Single mutation instead of manual Supabase calls
    updateSettings({
      portfolioSize: formSettings.portfolioSize,
      riskMode: formSettings.riskMode,
      riskPerTrade: formSettings.riskPerTrade,
      configured: true,
    });

    onClose();
  };

  if (!open) return null;

  // ... (שאר ה-JSX נשאר זהה - רק החלפת loading ל-isUpdating)
  
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ... Header ... */}

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Portfolio Size Input */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Portfolio Size
                  <span className="text-zinc-500 text-xs ml-2">(Total account value)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    value={formSettings.portfolioSize}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        portfolioSize: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full pl-12 pr-4 py-3.5 bg-zinc-800 border rounded-xl text-lg font-semibold text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C9A646] focus:border-transparent transition-all ${
                      errors.portfolioSize ? 'border-red-500' : 'border-zinc-700'
                    }`}
                    placeholder="10000"
                    step="100"
                  />
                </div>
                {errors.portfolioSize && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.portfolioSize}
                  </p>
                )}
              </div>

              {/* Risk Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Risk Calculation Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, riskMode: 'percentage' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formSettings.riskMode === 'percentage'
                        ? 'border-[#C9A646] bg-[#C9A646]/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <Percent
                      className={`w-5 h-5 mb-2 ${
                        formSettings.riskMode === 'percentage' ? 'text-[#C9A646]' : 'text-zinc-400'
                      }`}
                    />
                    <div className="text-sm font-medium text-zinc-200">Percentage</div>
                    <div className="text-xs text-zinc-500 mt-1">% of portfolio</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, riskMode: 'fixed' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formSettings.riskMode === 'fixed'
                        ? 'border-[#C9A646] bg-[#C9A646]/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <DollarSign
                      className={`w-5 h-5 mb-2 ${
                        formSettings.riskMode === 'fixed' ? 'text-[#C9A646]' : 'text-zinc-400'
                      }`}
                    />
                    <div className="text-sm font-medium text-zinc-200">Fixed Amount</div>
                    <div className="text-xs text-zinc-500 mt-1">Fixed $ per trade</div>
                  </button>
                </div>
              </div>

              {/* Risk Per Trade Input */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Risk Per Trade (1R)
                  <span className="text-zinc-500 text-xs ml-2">
                    {formSettings.riskMode === 'percentage'
                      ? '(Percentage of portfolio)'
                      : '(Fixed dollar amount)'}
                  </span>
                </label>
                <div className="relative">
                  {formSettings.riskMode === 'percentage' ? (
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  ) : (
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  )}
                  <input
                    type="number"
                    value={formSettings.riskPerTrade}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        riskPerTrade: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full pl-12 pr-4 py-3.5 bg-zinc-800 border rounded-xl text-lg font-semibold text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C9A646] focus:border-transparent transition-all ${
                      errors.riskPerTrade ? 'border-red-500' : 'border-zinc-700'
                    }`}
                    placeholder={formSettings.riskMode === 'percentage' ? '1' : '100'}
                    step={formSettings.riskMode === 'percentage' ? '0.1' : '10'}
                  />
                </div>
                {errors.riskPerTrade && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.riskPerTrade}
                  </p>
                )}
                <p className="text-zinc-500 text-xs mt-2">
                  {formSettings.riskMode === 'percentage'
                    ? 'Recommended: 0.5% - 2% per trade'
                    : 'Recommended: Keep under 10% of portfolio'}
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* 1R Value Card */}
              <div className="p-6 rounded-xl border-2 border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/5 to-[#C9A646]/10 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C9A646]/10 rounded-full blur-3xl"></div>

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400">Your 1R Value</span>
                  </div>

                  <div className="text-5xl font-bold text-[#C9A646] mb-2">
                    ${formatNumber(calculated1R, 2)}
                  </div>

                  <p className="text-xs text-zinc-500 mb-4">
                    {formSettings.riskMode === 'percentage'
                      ? `${formSettings.riskPerTrade}% of $${formatNumber(formSettings.portfolioSize, 0)}`
                      : 'Fixed amount per trade'}
                  </p>

                  {/* Example Trades */}
                  <div className="mt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <div className="text-xs text-zinc-400 mb-2 font-medium">Example Trades</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">+2R Win:</span>
                        <span className="text-emerald-400 font-semibold">
                          +${formatNumber(calculated1R * 2, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">-1R Loss:</span>
                        <span className="text-red-400 font-semibold">
                          -${formatNumber(calculated1R, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">+3.5R Win:</span>
                        <span className="text-yellow-400 font-semibold">
                          +${formatNumber(calculated1R * 3.5, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-400 leading-relaxed">
                      <span className="font-semibold">1R</span> represents your risk per trade. This
                      helps you measure performance consistently. For example, if you risk $100 and
                      make $200, that's a +2R win.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning for high risk */}
              {((formSettings.riskMode === 'percentage' && formSettings.riskPerTrade > 5) ||
                (formSettings.riskMode === 'fixed' &&
                  formSettings.riskPerTrade > formSettings.portfolioSize * 0.05)) && (
                <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-400 text-sm font-semibold mb-1">High Risk Warning</p>
                      <p className="text-red-400/80 text-xs leading-relaxed">
                        You're risking more than recommended. Professional traders typically risk
                        1-2% per trade.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-zinc-800 flex gap-4">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl transition-all font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E6C675] hover:from-[#B8944E] hover:to-[#C9A646] text-black rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}