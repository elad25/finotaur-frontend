// =====================================================
// DISCLAIMER POPUP - ORIGINAL COMPACT DESIGN
// Matches the original 480px card with WAR ZONE + Price header
// =====================================================

import { memo, useState, lazy, Suspense } from 'react';
import { X, Crown, Sparkles, FileText, Calendar, Shield, TrendingUp, Check, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiscordIcon } from '../VisualComponents';

// Lazy load terms modal
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
      
      {/* Popup Card - COMPACT 480px */}
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
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ 
            background: 'linear-gradient(90deg, transparent 5%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.9) 50%, rgba(201,166,70,0.5) 80%, transparent 95%)' 
          }} />

          {/* Content */}
          <div className="px-8 pt-6 pb-7">
            
            {/* Header Row - WAR ZONE + Price on same line */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Crown icon */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl blur-md" style={{ background: 'rgba(201,166,70,0.4)' }} />
                  <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(201,166,70,0.1) 100%)',
                    border: '1px solid rgba(201,166,70,0.5)'
                  }}>
                    <Crown className="w-6 h-6 text-[#F4D97B]" />
                  </div>
                </div>
                
                {/* Title + Price */}
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-bold text-white tracking-wide">WAR ZONE</h2>
                  <div className="flex items-baseline gap-1">
                    {isMonthly && isTopSecretMember && originalPrice && (
                      <span className="text-lg text-[#C9A646]/40 line-through">${originalPrice}</span>
                    )}
                    <span className="text-2xl font-bold" style={{ 
                      background: 'linear-gradient(180deg, #F4D97B 0%, #C9A646 100%)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent'
                    }}>${displayPrice}</span>
                    <span className="text-[#C9A646]/60 text-base">/{isMonthly ? 'mo' : 'yr'}</span>
                  </div>
                </div>
              </div>
              
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-[#C9A646]/50 hover:text-[#C9A646]" />
              </button>
            </div>

            {/* Subtitle / Billing info */}
            <div className="mb-6">
              {isMonthly && isTopSecretMember && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3" style={{ 
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.2) 0%, rgba(147,51,234,0.1) 100%)',
                  border: '1px solid rgba(147,51,234,0.4)'
                }}>
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 text-sm font-semibold">TOP SECRET DISCOUNT</span>
                </div>
              )}
              {!isMonthly && (
                <p className="text-[#C9A646]/80 text-base">~${Math.round(CONFIG.YEARLY_MONTHLY_EQUIVALENT)}/month • <span className="text-green-400 font-semibold">Save ${YEARLY_SAVINGS}/year</span></p>
              )}
              {isMonthly && isTopSecretMember && (
                <p className="text-green-400 text-base font-semibold">Save ${(CONFIG.MONTHLY_PRICE - CONFIG.MONTHLY_PRICE_TOPSECRET).toFixed(2)}/month!</p>
              )}
              {isMonthly && !isTopSecretMember && (
                <p className="text-[#C9A646]/50 text-base">Billed monthly • Cancel anytime</p>
              )}
            </div>

            {/* What's Included - 3 items only */}
            <div className="rounded-xl p-5 mb-5" style={{ 
              background: 'linear-gradient(180deg, rgba(30,25,18,0.6) 0%, rgba(20,16,12,0.8) 100%)',
              border: '1px solid rgba(201,166,70,0.25)'
            }}>
              <h4 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F4D97B]" />
                What's Included
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {/* Daily Report */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)', 
                    border: '1px solid rgba(201,166,70,0.3)' 
                  }}>
                    <FileText className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Daily Report</p>
                    <p className="text-[#8B8175] text-xs">9:00 AM NY</p>
                  </div>
                </div>
                
                {/* Weekly Review */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)', 
                    border: '1px solid rgba(201,166,70,0.3)' 
                  }}>
                    <Calendar className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Weekly Review</p>
                    <p className="text-[#8B8175] text-xs">Every Sunday</p>
                  </div>
                </div>
                
                {/* Discord */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)', 
                    border: '1px solid rgba(201,166,70,0.3)' 
                  }}>
                    <DiscordIcon className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Discord</p>
                    <p className="text-[#8B8175] text-xs">847+ traders</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trial/Value Badge */}
            {isMonthly ? (
              <div className="relative flex items-center gap-4 px-5 py-4 rounded-xl mb-5" style={{ 
                background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)', 
                border: '1px solid rgba(34,197,94,0.35)'
              }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)'
                }}>
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-bold text-lg">7-Day Free Trial</p>
                  <p className="text-[#8B8175] text-sm">Full access • Cancel anytime • No charge during trial</p>
                </div>
              </div>
            ) : (
              <div className="relative flex items-center gap-4 px-5 py-4 rounded-xl mb-5" style={{ 
                background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)', 
                border: '1px solid rgba(201,166,70,0.35)'
              }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  background: 'rgba(201,166,70,0.15)',
                  border: '1px solid rgba(201,166,70,0.4)'
                }}>
                  <TrendingUp className="w-6 h-6 text-[#F4D97B]" />
                </div>
                <div>
                  <p className="text-[#F4D97B] font-bold text-lg">Best Value — Save ${YEARLY_SAVINGS}!</p>
                  <p className="text-[#8B8175] text-sm">Lock in your price • Full year access • Instant activation</p>
                </div>
              </div>
            )}

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-6 group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                <div 
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center transition-all",
                    !agreed && "group-hover:border-[#C9A646]/70"
                  )}
                  style={{ 
                    background: agreed ? 'linear-gradient(135deg, #C9A646, #F4D97B)' : 'rgba(201,166,70,0.05)',
                    border: agreed ? 'none' : '2px solid rgba(201,166,70,0.4)',
                    boxShadow: agreed ? '0 0 12px rgba(201,166,70,0.4)' : 'none'
                  }}
                >
                  {agreed && <Check className="w-4 h-4 text-black" />}
                </div>
              </div>
              <span className="text-[#A8A090] text-sm leading-relaxed">
                I acknowledge that FINOTAUR does not provide investment advice and that all content is for informational purposes only. I agree to the{' '}
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }}
                  className="text-[#C9A646] hover:text-[#F4D97B] underline underline-offset-2 transition-colors font-medium"
                >
                  Terms & Disclaimer
                </button>
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 rounded-xl font-semibold text-base transition-all hover:bg-[#C9A646]/15"
                style={{ 
                  background: 'rgba(201,166,70,0.06)',
                  border: '1px solid rgba(201,166,70,0.25)',
                  color: '#C9A646'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={onAccept}
                disabled={!agreed || isProcessing}
                className={cn(
                  "flex-[1.5] py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all",
                  agreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed opacity-50"
                )}
                style={agreed ? { 
                  background: 'linear-gradient(135deg, #A68A3A 0%, #C9A646 20%, #F4D97B 50%, #C9A646 80%, #A68A3A 100%)',
                  boxShadow: '0 4px 25px rgba(201,166,70,0.5)',
                  color: '#1a1510'
                } : {
                  background: 'rgba(201,166,70,0.15)',
                  color: 'rgba(201,166,70,0.4)'
                }}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                {isProcessing ? 'Processing...' : isMonthly ? 'Start 7-Day Free Trial' : 'Subscribe Now'}
              </button>
            </div>
          </div>
          
          {/* Bottom gold line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ 
            background: 'linear-gradient(90deg, transparent 5%, rgba(201,166,70,0.3) 20%, rgba(244,217,123,0.6) 50%, rgba(201,166,70,0.3) 80%, transparent 95%)'
          }} />
        </div>
      </div>
    </div>
  );
});

export default DisclaimerPopup;