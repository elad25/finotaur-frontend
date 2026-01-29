// =====================================================
// DISCLAIMER POPUP - Code Split Modal
// =====================================================

import { memo, useState, lazy, Suspense } from 'react';
import { X, Crown, Sparkles, FileText, Calendar, Shield, TrendingUp, Check, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiscordIcon } from '../VisualComponents';

// Lazy load terms modal (same folder)
const TermsModal = lazy(() => import('./TermsModal'));

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  MONTHLY_PRICE: 69.99,
  YEARLY_PRICE: 699,
  MONTHLY_PRICE_TOPSECRET: 30,
  YEARLY_MONTHLY_EQUIVALENT: 58.25,
};

const YEARLY_SAVINGS = Math.round((CONFIG.MONTHLY_PRICE * 12) - CONFIG.YEARLY_PRICE);

type BillingInterval = 'monthly' | 'yearly';

// ============================================
// COMPONENT
// ============================================

interface DisclaimerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  isProcessing: boolean;
  billingInterval: BillingInterval;
  isTopSecretMember: boolean;
}

const DisclaimerPopup = memo(function DisclaimerPopup({ 
  isOpen, 
  onClose, 
  onAccept, 
  isProcessing, 
  billingInterval, 
  isTopSecretMember 
}: DisclaimerPopupProps) {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  const isMonthly = billingInterval === 'monthly';
  const displayPrice = isMonthly 
    ? (isTopSecretMember ? CONFIG.MONTHLY_PRICE_TOPSECRET : CONFIG.MONTHLY_PRICE) 
    : CONFIG.YEARLY_PRICE;
  const originalPrice = isMonthly ? CONFIG.MONTHLY_PRICE : null;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-16">
      {/* Terms Modal */}
      <Suspense fallback={null}>
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      </Suspense>
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md" 
        style={{ background: 'radial-gradient(ellipse at center, rgba(20,16,12,0.95) 0%, rgba(0,0,0,0.98) 100%)' }}
        onClick={onClose} 
      />
      
      {/* Popup Card */}
      <div className="relative w-full max-w-[480px]">
        
        {/* Glow effects */}
        <div className="absolute -inset-3 rounded-3xl opacity-40" style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.4) 0%, transparent 50%, rgba(201,166,70,0.3) 100%)',
          filter: 'blur(25px)'
        }} />
        
        {/* Main card */}
        <div className="relative rounded-2xl overflow-hidden" style={{ 
          background: 'linear-gradient(180deg, rgba(32,26,20,0.99) 0%, rgba(18,14,10,1) 100%)',
          border: '1px solid rgba(201,166,70,0.5)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(201,166,70,0.1)'
        }}>
          
          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] divider-gold" />

          {/* Content */}
          <div className="px-8 pt-6 pb-7">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center icon-container-gold">
                  <Crown className="w-5 h-5 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl tracking-tight">War Zone Intel</h3>
                  <p className="text-[#C9A646]/60 text-sm">Premium Subscription</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-[#C9A646]/30 transition-all"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Price Display */}
            <div className="text-center mb-6 p-5 rounded-xl bg-[#C9A646]/[0.06] border border-[#C9A646]/20">
              <div className="flex items-baseline justify-center gap-2 mb-1">
                {isTopSecretMember && isMonthly && originalPrice && (
                  <span className="text-slate-500 line-through text-lg">${originalPrice}</span>
                )}
                <span className="text-4xl font-bold text-[#C9A646]">${displayPrice}</span>
                <span className="text-[#C9A646]/60 text-sm">/{isMonthly ? 'month' : 'year'}</span>
              </div>
              {!isMonthly && (
                <p className="text-green-400/90 text-sm font-medium">
                  Save ${YEARLY_SAVINGS}/year • ${CONFIG.YEARLY_MONTHLY_EQUIVALENT}/mo equivalent
                </p>
              )}
              {isTopSecretMember && isMonthly && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30">
                  <Sparkles className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 text-xs font-semibold">Top Secret Member Discount Applied</span>
                </div>
              )}
              <p className="text-[#C9A646]/50 text-xs mt-2">7-day free trial • Cancel anytime</p>
            </div>

            {/* Features */}
            <div className="space-y-2.5 mb-6">
              {[
                { icon: FileText, text: 'Daily Intelligence Briefing' },
                { icon: Calendar, text: 'Weekly Tactical Review' },
                { icon: DiscordIcon, text: 'Discord Community Access' },
                { icon: Shield, text: 'Institutional-Grade Analysis' },
                { icon: TrendingUp, text: 'Actionable Trade Ideas' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#C9A646]/10">
                    <feature.icon className="w-3.5 h-3.5 text-[#C9A646]" />
                  </div>
                  <span className="text-slate-300 text-sm">{feature.text}</span>
                  <Check className="w-4 h-4 text-green-500 ml-auto" />
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 mb-5">
              <p className="text-amber-200/90 text-xs leading-relaxed">
                <strong className="text-amber-300">Important:</strong> This is financial research and analysis. 
                Past performance doesn't guarantee future results. Always do your own research and consult 
                a licensed financial advisor. Trading involves significant risk.
              </p>
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group mb-6">
              <div className="relative mt-0.5">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                  agreed 
                    ? "bg-[#C9A646] border-[#C9A646]" 
                    : "border-slate-600 group-hover:border-[#C9A646]/50"
                )}>
                  {agreed && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-slate-400 text-sm leading-relaxed">
                I understand the risks and agree to the{' '}
                <button onClick={() => setShowTerms(true)} className="text-[#C9A646] hover:underline">
                  Terms of Service
                </button>
              </span>
            </label>

            {/* CTA Button */}
            <button
              onClick={onAccept}
              disabled={!agreed || isProcessing}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all",
                agreed && !isProcessing
                  ? "btn-gold"
                  : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>Start 7-Day Free Trial</span>
                </>
              )}
            </button>

            {/* Footer */}
            <p className="text-center text-slate-500 text-xs mt-4">
              Secure checkout powered by Whop • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DisclaimerPopup;