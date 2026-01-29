// =====================================================
// DISCLAIMER POPUP - PREMIUM COMPACT v4.0
// More elegant, smaller, still delivers the message
// =====================================================

import { memo, useState } from 'react';
import { X, Crown, FileText, Calendar, Shield, TrendingUp, Check, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiscordIcon } from '../VisualComponents';
import { CONFIG, YEARLY_SAVINGS, type BillingInterval } from '../WarzonelandingComponents';
import TermsModal from './TermsModal';

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
  isOpen, onClose, onAccept, isProcessing, billingInterval, isTopSecretMember 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm" 
        style={{ background: 'rgba(0,0,0,0.85)' }} 
        onClick={onClose} 
      />
      
      {/* Popup Card - SMALLER: max-w-[380px] */}
      <div className="relative w-full max-w-[380px]">
        {/* Subtle outer glow */}
        <div 
          className="absolute -inset-[1px] rounded-2xl opacity-60" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(201,166,70,0.4) 0%, transparent 40%, transparent 60%, rgba(201,166,70,0.3) 100%)',
            filter: 'blur(8px)'
          }} 
        />
        
        {/* Main card */}
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(180deg, rgba(28,24,18,0.98) 0%, rgba(16,13,10,1) 100%)',
            border: '1px solid rgba(201,166,70,0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}
        >
          {/* Top accent line */}
          <div 
            className="absolute top-0 left-[10%] right-[10%] h-[1px]" 
            style={{ 
              background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.7), transparent)' 
            }} 
          />

          {/* Content - tighter padding */}
          <div className="px-6 pt-5 pb-5">
            
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Crown icon - smaller */}
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.08) 100%)',
                    border: '1px solid rgba(201,166,70,0.4)'
                  }}
                >
                  <Crown className="w-5 h-5 text-[#F4D97B]" />
                </div>
                
                {/* Title + Price inline */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-xl font-bold text-white tracking-wide">WAR ZONE</h2>
                    <div className="flex items-baseline gap-1">
                      {isMonthly && isTopSecretMember && originalPrice && (
                        <span className="text-sm text-[#C9A646]/40 line-through">${originalPrice}</span>
                      )}
                      <span 
                        className="text-xl font-bold"
                        style={{ 
                          background: 'linear-gradient(180deg, #F4D97B 0%, #C9A646 100%)', 
                          WebkitBackgroundClip: 'text', 
                          WebkitTextFillColor: 'transparent' 
                        }}
                      >
                        ${displayPrice}
                      </span>
                      <span className="text-[#C9A646]/50 text-sm">/{isMonthly ? 'mo' : 'yr'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-[#C9A646]/40 hover:text-[#C9A646]" />
              </button>
            </div>

            {/* Discount Badge - only if applicable */}
            {isMonthly && isTopSecretMember && (
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(147,51,234,0.08) 100%)',
                  border: '1px solid rgba(147,51,234,0.35)'
                }}
              >
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold">TOP SECRET DISCOUNT</span>
              </div>
            )}
            
            {/* Savings text */}
            <p className="text-green-400 text-sm font-medium mb-4">
              {isMonthly && isTopSecretMember 
                ? `Save $${(CONFIG.MONTHLY_PRICE - CONFIG.MONTHLY_PRICE_TOPSECRET).toFixed(2)}/month!`
                : isMonthly 
                  ? 'Cancel anytime • Billed monthly'
                  : `~$${Math.round(CONFIG.YEARLY_MONTHLY_EQUIVALENT)}/mo • Save $${YEARLY_SAVINGS}/year`
              }
            </p>

            {/* What's Included - COMPACT horizontal */}
            <div 
              className="rounded-xl p-3 mb-4"
              style={{ 
                background: 'rgba(201,166,70,0.04)',
                border: '1px solid rgba(201,166,70,0.15)'
              }}
            >
              <div className="flex items-center justify-around">
                {/* Daily */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-1"
                    style={{ background: 'rgba(201,166,70,0.1)' }}
                  >
                    <FileText className="w-4 h-4 text-[#C9A646]" />
                  </div>
                  <span className="text-white text-xs font-medium">Daily</span>
                  <span className="text-[#C9A646]/40 text-[10px]">9 AM NY</span>
                </div>
                
                {/* Divider */}
                <div className="w-px h-10 bg-[#C9A646]/15" />
                
                {/* Weekly */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-1"
                    style={{ background: 'rgba(201,166,70,0.1)' }}
                  >
                    <Calendar className="w-4 h-4 text-[#C9A646]" />
                  </div>
                  <span className="text-white text-xs font-medium">Weekly</span>
                  <span className="text-[#C9A646]/40 text-[10px]">Sunday</span>
                </div>
                
                {/* Divider */}
                <div className="w-px h-10 bg-[#C9A646]/15" />
                
                {/* Discord */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-1"
                    style={{ background: 'rgba(201,166,70,0.1)' }}
                  >
                    <DiscordIcon className="w-4 h-4 text-[#C9A646]" />
                  </div>
                  <span className="text-white text-xs font-medium">Discord</span>
                  <span className="text-[#C9A646]/40 text-[10px]">847+</span>
                </div>
              </div>
            </div>

            {/* Trial/Value Badge - COMPACT */}
            <div 
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-4"
              style={{ 
                background: isMonthly 
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.03) 100%)',
                border: `1px solid ${isMonthly ? 'rgba(34,197,94,0.25)' : 'rgba(201,166,70,0.25)'}`
              }}
            >
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isMonthly ? 'rgba(34,197,94,0.12)' : 'rgba(201,166,70,0.12)',
                }}
              >
                {isMonthly 
                  ? <Shield className="w-4 h-4 text-green-400" />
                  : <TrendingUp className="w-4 h-4 text-[#F4D97B]" />
                }
              </div>
              <div>
                <p className={`font-semibold text-sm ${isMonthly ? 'text-green-400' : 'text-[#F4D97B]'}`}>
                  {isMonthly ? '7-Day Free Trial' : `Best Value – Save $${YEARLY_SAVINGS}`}
                </p>
                <p className="text-[#8B8175] text-[11px]">
                  {isMonthly ? 'Full access • No charge during trial' : 'Price locked forever'}
                </p>
              </div>
            </div>

            {/* Checkbox - COMPACT */}
            <label className="flex items-start gap-2.5 cursor-pointer mb-4 group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)} 
                  className="sr-only" 
                />
                <div 
                  className={cn(
                    "w-5 h-5 rounded flex items-center justify-center transition-all",
                    !agreed && "group-hover:border-[#C9A646]/60"
                  )}
                  style={{ 
                    background: agreed ? 'linear-gradient(135deg, #C9A646, #F4D97B)' : 'rgba(201,166,70,0.05)',
                    border: agreed ? 'none' : '1.5px solid rgba(201,166,70,0.35)',
                    boxShadow: agreed ? '0 0 10px rgba(201,166,70,0.3)' : 'none'
                  }}
                >
                  {agreed && <Check className="w-3 h-3 text-black" />}
                </div>
              </div>
              <span className="text-[#9A9080] text-xs leading-relaxed">
                I acknowledge that FINOTAUR does not provide investment advice. I agree to the{' '}
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }}
                  className="text-[#C9A646] hover:text-[#F4D97B] underline underline-offset-2 transition-colors"
                >
                  Terms & Disclaimer
                </button>
              </span>
            </label>

            {/* Buttons - side by side, COMPACT */}
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all hover:bg-[#C9A646]/10"
                style={{ 
                  background: 'rgba(201,166,70,0.05)',
                  border: '1px solid rgba(201,166,70,0.2)',
                  color: '#C9A646'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={onAccept}
                disabled={!agreed || isProcessing}
                className={cn(
                  "flex-[1.3] py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all",
                  agreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed opacity-50"
                )}
                style={agreed ? { 
                  background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.4)',
                  color: '#1a1510'
                } : {
                  background: 'rgba(201,166,70,0.12)',
                  color: 'rgba(201,166,70,0.35)'
                }}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                {isProcessing ? 'Processing...' : isMonthly ? 'Start Free Trial' : 'Subscribe Now'}
              </button>
            </div>
          </div>
          
          {/* Bottom accent line */}
          <div 
            className="absolute bottom-0 left-[10%] right-[10%] h-[1px]" 
            style={{ 
              background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.4), transparent)' 
            }} 
          />
        </div>
      </div>
    </div>
  );
});

export default DisclaimerPopup;