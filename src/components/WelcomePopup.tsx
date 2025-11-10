// ================================================
// ONBOARDING DIALOG - 4 STEPS WITH RISK SETUP
// ✅ Step 1: Welcome to Finotaur
// ✅ Step 2: Set Your Risk Parameters (explains why)
// ✅ Step 3: Risk Management Setup (actual configuration!)
// ✅ Step 4: Start Trading Smartly (ready to go)
// 
// Replaces WelcomePopup.tsx - now everything is configured in the onboarding
// No redirect to Settings needed!
// ================================================

import { useState, useEffect } from 'react';
import { X, DollarSign, Percent, AlertCircle, CheckCircle2, TrendingUp, Info, Zap, Shield, Target, ArrowRight } from 'lucide-react';
import { formatNumber } from '@/utils/smartCalc';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface WelcomePopupProps {
  open: boolean;
  onClose: () => void;
}

type RiskMode = 'percentage' | 'fixed';

interface RiskSettings {
  portfolioSize: number;
  riskMode: RiskMode;
  riskPerTrade: number;
}

const DEFAULT_SETTINGS: RiskSettings = {
  portfolioSize: 10000,
  riskMode: 'percentage',
  riskPerTrade: 1,
};

// Export as WelcomePopup for backwards compatibility
export function WelcomePopup({ open, onClose }: WelcomePopupProps) {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load user ID on mount
  useEffect(() => {
    if (open) {
      loadUser();
    }
  }, [open]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (e) {
      console.error('Failed to load user:', e);
    }
  };

  // Calculate 1R value
  const calculated1R =
    settings.riskMode === 'percentage'
      ? (settings.portfolioSize * settings.riskPerTrade) / 100
      : settings.riskPerTrade;

  // Validate risk settings
  const validateRiskSettings = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (settings.portfolioSize <= 0) {
      newErrors.portfolioSize = 'Portfolio size must be positive';
    }

    if (settings.riskPerTrade <= 0) {
      newErrors.riskPerTrade = 'Risk per trade must be positive';
    }

    if (settings.riskMode === 'percentage' && settings.riskPerTrade > 10) {
      newErrors.riskPerTrade = 'Risk > 10% is extremely dangerous!';
    }

    if (settings.riskMode === 'fixed' && settings.riskPerTrade > settings.portfolioSize * 0.1) {
      newErrors.riskPerTrade = 'Risk per trade should not exceed 10% of portfolio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save risk settings to Supabase
  const saveRiskSettings = async () => {
    if (!validateRiskSettings()) return false;
    if (!userId) {
      toast.error('User not found');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          portfolio_size: settings.portfolioSize,
          risk_mode: settings.riskMode,
          risk_per_trade: settings.riskPerTrade,
          risk_configured: true,
          onboarding_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Mark as seen in localStorage
      localStorage.setItem('finotaur_seen_welcome', 'true');
      
      return true;
    } catch (e) {
      console.error('Failed to save risk settings:', e);
      toast.error('Failed to save settings. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      // Step 3 (Risk Settings) - Save before proceeding
      const saved = await saveRiskSettings();
      if (saved) {
        setStep(4);
      }
    } else if (step === 4) {
      // Final step - complete onboarding
      toast.success('Welcome to Finotaur! 🎉');
      onClose();
    } else {
      // Steps 1-2 - just move forward
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    // Mark as seen and close
    localStorage.setItem('finotaur_seen_welcome', 'true');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button only on steps 1-2 */}
        {step <= 2 && (
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        )}

        {/* Progress Indicator */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-[#C9A646]'
                  : s < step
                  ? 'w-6 bg-[#C9A646]/50'
                  : 'w-6 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <div className="p-8 pt-16">
          {/* STEP 1: Welcome to Finotaur */}
          {step === 1 && (
            <div className="text-center space-y-8 animate-fadeIn">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-2xl bg-[#C9A646]/10 border-2 border-[#C9A646]/30 flex items-center justify-center">
                  <Shield className="w-12 h-12 text-[#C9A646]" />
                </div>
              </div>

              <div>
                <h2 className="text-4xl font-bold text-white mb-3">Welcome to Finotaur</h2>
                <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                  The professional trading journal that helps you become consistently profitable.
                </p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                {[
                  { icon: Zap, text: 'Track every trade with precision' },
                  { icon: TrendingUp, text: 'Analyze your performance with AI' },
                  { icon: Target, text: 'Build winning strategies' },
                  { icon: Shield, text: 'Manage risk like a pro' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <span className="text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 max-w-lg mx-auto">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl transition-all font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E6C675] hover:from-[#B8944E] hover:to-[#C9A646] text-black rounded-xl transition-all font-semibold flex items-center justify-center gap-2 group"
                >
                  Next
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Why Risk Parameters Matter */}
          {step === 2 && (
            <div className="text-center space-y-8 animate-fadeIn">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-2xl bg-[#C9A646]/10 border-2 border-[#C9A646]/30 flex items-center justify-center">
                  <DollarSign className="w-12 h-12 text-[#C9A646]" />
                </div>
              </div>

              <div>
                <h2 className="text-4xl font-bold text-white mb-3">Set Your Risk Parameters</h2>
                <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                  Before you start, let's configure your 1R (risk per trade).
                </p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                {[
                  { icon: Zap, text: 'Define your portfolio size' },
                  { icon: Percent, text: 'Set risk per trade (% or fixed $)' },
                  { icon: TrendingUp, text: 'Track your R multiples on every trade' },
                  { icon: CheckCircle2, text: 'Know exactly how much you\'re risking' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <span className="text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 max-w-lg mx-auto">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl transition-all font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E6C675] hover:from-[#B8944E] hover:to-[#C9A646] text-black rounded-xl transition-all font-semibold flex items-center justify-center gap-2 group"
                >
                  Set Up Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Risk Management Setup (THE ACTUAL CONFIGURATION) */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Risk Management Setup</h2>
                <p className="text-zinc-400">
                  Define your portfolio size and risk parameters to calculate your 1R
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN - Input Fields */}
                <div className="space-y-6">
                  {/* Portfolio Size */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      Portfolio Size
                      <span className="text-zinc-500 text-xs ml-2">(Total account value)</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="number"
                        value={settings.portfolioSize}
                        onChange={(e) =>
                          setSettings({ ...settings, portfolioSize: parseFloat(e.target.value) || 0 })
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
                    <label className="block text-sm font-medium text-zinc-300 mb-3">Risk Calculation Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, riskMode: 'percentage' })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          settings.riskMode === 'percentage'
                            ? 'border-[#C9A646] bg-[#C9A646]/10'
                            : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <Percent className={`w-5 h-5 mb-2 ${
                          settings.riskMode === 'percentage' ? 'text-[#C9A646]' : 'text-zinc-400'
                        }`} />
                        <div className="text-sm font-medium text-zinc-200">Percentage</div>
                        <div className="text-xs text-zinc-500 mt-1">% of portfolio</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, riskMode: 'fixed' })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          settings.riskMode === 'fixed'
                            ? 'border-[#C9A646] bg-[#C9A646]/10'
                            : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <DollarSign className={`w-5 h-5 mb-2 ${
                          settings.riskMode === 'fixed' ? 'text-[#C9A646]' : 'text-zinc-400'
                        }`} />
                        <div className="text-sm font-medium text-zinc-200">Fixed Amount</div>
                        <div className="text-xs text-zinc-500 mt-1">Fixed $ per trade</div>
                      </button>
                    </div>
                  </div>

                  {/* Risk Per Trade */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      Risk Per Trade (1R)
                      <span className="text-zinc-500 text-xs ml-2">
                        {settings.riskMode === 'percentage' ? '(Percentage of portfolio)' : '(Fixed dollar amount)'}
                      </span>
                    </label>
                    <div className="relative">
                      {settings.riskMode === 'percentage' ? (
                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      ) : (
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      )}
                      <input
                        type="number"
                        value={settings.riskPerTrade}
                        onChange={(e) =>
                          setSettings({ ...settings, riskPerTrade: parseFloat(e.target.value) || 0 })
                        }
                        className={`w-full pl-12 pr-4 py-3.5 bg-zinc-800 border rounded-xl text-lg font-semibold text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C9A646] focus:border-transparent transition-all ${
                          errors.riskPerTrade ? 'border-red-500' : 'border-zinc-700'
                        }`}
                        placeholder={settings.riskMode === 'percentage' ? '1' : '100'}
                        step={settings.riskMode === 'percentage' ? '0.1' : '10'}
                      />
                    </div>
                    {errors.riskPerTrade && (
                      <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.riskPerTrade}
                      </p>
                    )}
                    <p className="text-zinc-500 text-xs mt-2">
                      {settings.riskMode === 'percentage'
                        ? 'Recommended: 0.5% - 2% per trade'
                        : 'Recommended: Keep under 10% of portfolio'}
                    </p>
                  </div>
                </div>

                {/* RIGHT COLUMN - 1R Display */}
                <div className="space-y-6">
                  <div className="p-6 rounded-xl border-2 border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/5 to-[#C9A646]/10 relative overflow-hidden h-full flex flex-col">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C9A646]/10 rounded-full blur-3xl"></div>
                    
                    <div className="relative flex-1">
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
                        {settings.riskMode === 'percentage'
                          ? `${settings.riskPerTrade}% of $${formatNumber(settings.portfolioSize, 0)}`
                          : 'Fixed amount per trade'}
                      </p>

                      {/* Example Trades */}
                      <div className="mt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <div className="text-xs text-zinc-400 mb-2 font-medium">Example Trades</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">+2R Win:</span>
                            <span className="text-emerald-400 font-semibold">+${formatNumber(calculated1R * 2, 0)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">-1R Loss:</span>
                            <span className="text-red-400 font-semibold">-${formatNumber(calculated1R, 0)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">+3.5R Win:</span>
                            <span className="text-yellow-400 font-semibold">+${formatNumber(calculated1R * 3.5, 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="mt-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-blue-400 leading-relaxed">
                              <span className="font-semibold">1R</span> represents your risk per trade. 
                              This helps you measure performance consistently.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Warning for high risk */}
                      {((settings.riskMode === 'percentage' && settings.riskPerTrade > 5) ||
                        (settings.riskMode === 'fixed' && settings.riskPerTrade > settings.portfolioSize * 0.05)) && (
                        <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-red-400 text-sm font-semibold mb-1">High Risk Warning</p>
                              <p className="text-red-400/80 text-xs leading-relaxed">
                                Professional traders typically risk 1-2% per trade.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl transition-all font-medium disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E6C675] hover:from-[#B8944E] hover:to-[#C9A646] text-black rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Continue
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: You're All Set! */}
          {step === 4 && (
            <div className="text-center space-y-8 animate-fadeIn py-8">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-2xl bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>

              <div>
                <h2 className="text-4xl font-bold text-white mb-3">You're All Set!</h2>
                <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                  Your risk management is configured. Start tracking your trades and building your edge.
                </p>
              </div>

              {/* Quick Stats Summary */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700">
                  <div className="text-2xl font-bold text-[#C9A646] mb-1">
                    ${formatNumber(settings.portfolioSize, 0)}
                  </div>
                  <div className="text-xs text-zinc-500">Portfolio Size</div>
                </div>

                <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700">
                  <div className="text-2xl font-bold text-[#C9A646] mb-1">
                    {settings.riskMode === 'percentage' 
                      ? `${settings.riskPerTrade}%`
                      : `$${formatNumber(settings.riskPerTrade, 0)}`
                    }
                  </div>
                  <div className="text-xs text-zinc-500">Risk Per Trade</div>
                </div>

                <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700">
                  <div className="text-2xl font-bold text-[#C9A646] mb-1">
                    ${formatNumber(calculated1R, 2)}
                  </div>
                  <div className="text-xs text-zinc-500">Your 1R</div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-white mb-4">What's Next?</h3>
                <div className="space-y-3 text-left">
                  {[
                    'Log your first trade and see your P&L in R units',
                    'Review your statistics and identify patterns',
                    'Build strategies and refine your edge over time',
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#C9A646]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[#C9A646] text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-zinc-300">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNext}
                className="px-8 py-4 bg-gradient-to-r from-[#C9A646] to-[#E6C675] hover:from-[#B8944E] hover:to-[#C9A646] text-black rounded-xl transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mx-auto"
              >
                Start Trading
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}