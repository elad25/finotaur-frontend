// src/components/subscription/UsageWarningModal.tsx
// ✅ Sophisticated warning for BASIC users approaching limits
import { X, TrendingUp, Zap, Crown, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UsageWarningModalProps {
  open: boolean;
  onClose: () => void;
  daysActive: number;
  avgTradesPerDay: number;
  projectedTotal: number;
  daysRemaining: number;
  currentTradeCount: number;
}

export function UsageWarningModal({
  open,
  onClose,
  daysActive,
  avgTradesPerDay,
  projectedTotal,
  daysRemaining,
  currentTradeCount
}: UsageWarningModalProps) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/app/journal/pricing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-gradient-to-br from-[#141414] via-[#1A1A1A] to-[#0A0A0A] border-2 rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          borderColor: 'rgba(201, 166, 70, 0.3)',
          boxShadow: '0 0 80px rgba(201, 166, 70, 0.15), 0 0 40px rgba(201, 166, 70, 0.1)'
        }}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-[#C9A646]"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                  animation: `float ${Math.random() * 3 + 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Content */}
        <div className="relative p-8">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div 
                className="absolute inset-0 rounded-full blur-2xl animate-pulse"
                style={{ background: 'radial-gradient(circle, rgba(201,166,70,0.4), transparent)' }}
              />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A646] to-[#E5C158] flex items-center justify-center shadow-lg">
                <TrendingUp className="w-10 h-10 text-black" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              You're Trading Like a Pro! 🚀
            </h2>
            <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
              Your trading activity is impressive, but you're approaching your monthly limit on the Basic plan.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Days Active</div>
              <div className="text-2xl font-bold text-white">{daysActive}</div>
              <div className="text-xs text-zinc-600 mt-1">of 30 days</div>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Avg. Trades/Day</div>
              <div className="text-2xl font-bold text-[#C9A646]">{avgTradesPerDay}</div>
              <div className="text-xs text-zinc-600 mt-1">trades per day</div>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Projected Total</div>
              <div className="text-2xl font-bold text-orange-400">{projectedTotal}</div>
              <div className="text-xs text-zinc-600 mt-1">this month</div>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Days Left</div>
              <div className="text-2xl font-bold text-white">{daysRemaining}</div>
              <div className="text-xs text-zinc-600 mt-1">in cycle</div>
            </div>
          </div>

          {/* Current Usage */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-300">Trades This Month</div>
              <div className="text-xl font-bold text-blue-400">{currentTradeCount}</div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-orange-300 mb-1">
                  You may hit your limit soon
                </div>
                <div className="text-xs text-orange-200/80 leading-relaxed">
                  At your current pace, you'll reach approximately <span className="font-bold text-orange-400">{projectedTotal} trades</span> this month. 
                  To continue trading without interruption, we recommend upgrading to Premium.
                </div>
              </div>
            </div>
          </div>

          {/* Premium Benefits */}
          <div className="bg-gradient-to-br from-[#C9A646]/10 to-[#C9A646]/5 border border-[#C9A646]/20 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm font-bold text-[#C9A646]">Premium Benefits</span>
            </div>
            
            <ul className="space-y-2">
              {[
                '∞ Unlimited trades every month',
                '📊 Advanced analytics & charts',
                '🤖 AI-powered insights',
                '📈 Strategy performance tracking',
                '⚡ Priority support',
                '📄 Export reports (PDF/CSV)',
                '🚫 No interruptions to your trading'
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#C9A646] to-[#E5C158] text-black font-bold rounded-xl hover:shadow-lg hover:shadow-[#C9A646]/20 transition-all duration-300 group"
            >
              <Zap className="w-4 h-4" />
              <span>Upgrade to Premium</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl transition-colors"
            >
              I'll Upgrade Later
            </button>
          </div>

          {/* Fine Print */}
          <div className="mt-4 text-center">
            <p className="text-[10px] text-zinc-600">
              Cancel anytime • No hidden fees • Instant activation
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}