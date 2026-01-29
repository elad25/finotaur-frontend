// =====================================================
// DISCLAIMER POPUP - PREMIUM LUXURIOUS v5.0
// Larger, more elegant, premium feel
// =====================================================

import { memo, useState } from 'react';
import { X, Crown, FileText, Calendar, Shield, TrendingUp, Check, Loader2, Rocket, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center py-20 px-4">
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      
      {/* Backdrop with premium blur */}
      <div 
        className="absolute inset-0 backdrop-blur-md" 
        style={{ background: 'rgba(0,0,0,0.88)' }} 
        onClick={onClose} 
      />
      
      {/* Popup Card - LARGER: max-w-[460px] */}
      <div className="relative w-full max-w-[460px]">
        {/* Animated outer glow */}
        <div 
          className="absolute -inset-[2px] rounded-3xl opacity-70 animate-pulse" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(244,217,123,0.5) 0%, rgba(201,166,70,0.2) 25%, transparent 50%, rgba(201,166,70,0.2) 75%, rgba(244,217,123,0.5) 100%)',
            filter: 'blur(12px)',
            animationDuration: '3s'
          }} 
        />
        
        {/* Secondary glow layer */}
        <div 
          className="absolute -inset-[1px] rounded-3xl" 
          style={{ 
            background: 'linear-gradient(180deg, rgba(244,217,123,0.3) 0%, transparent 30%, transparent 70%, rgba(201,166,70,0.2) 100%)',
          }} 
        />
        
        {/* Main card */}
        <div 
          className="relative rounded-3xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(180deg, rgba(32,28,20,0.99) 0%, rgba(18,15,11,1) 100%)',
            border: '1px solid rgba(201,166,70,0.4)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(244,217,123,0.1)'
          }}
        >
          {/* Top accent line - wider and more prominent */}
          <div 
            className="absolute top-0 left-[5%] right-[5%] h-[2px]" 
            style={{ 
              background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.8), transparent)' 
            }} 
          />
          
          {/* Corner accents */}
          <div 
            className="absolute top-0 left-0 w-20 h-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top left, rgba(244,217,123,0.08) 0%, transparent 70%)'
            }}
          />
          <div 
            className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top right, rgba(244,217,123,0.08) 0%, transparent 70%)'
            }}
          />

          {/* Content - more spacious padding */}
          <div className="px-8 pt-7 pb-7">
            
            {/* Header Row - Enhanced */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                {/* Crown icon - larger and more prominent */}
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center relative"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.25) 0%, rgba(201,166,70,0.1) 100%)',
                    border: '1px solid rgba(201,166,70,0.5)',
                    boxShadow: '0 4px 15px rgba(201,166,70,0.2)'
                  }}
                >
                  <Crown className="w-7 h-7 text-[#F4D97B]" />
                  {/* Sparkle accent */}
                  <Sparkles className="w-3 h-3 text-[#F4D97B] absolute -top-1 -right-1 opacity-70" />
                </div>
                
                {/* Title + Price */}
                <div>
                  <h2 
                    className="text-2xl font-bold tracking-wider mb-1"
                    style={{ 
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #E5E5E5 100%)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent' 
                    }}
                  >
                    WAR ZONE
                  </h2>
                  <div className="flex items-baseline gap-2">
                    {isMonthly && isTopSecretMember && originalPrice && (
                      <span className="text-base text-[#C9A646]/40 line-through">${originalPrice}</span>
                    )}
                    <span 
                      className="text-3xl font-bold"
                      style={{ 
                        background: 'linear-gradient(180deg, #F4D97B 0%, #C9A646 100%)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent' 
                      }}
                    >
                      ${displayPrice}
                    </span>
                    <span className="text-[#C9A646]/60 text-base font-medium">/{isMonthly ? 'mo' : 'yr'}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={onClose} 
                className="p-2 rounded-xl hover:bg-white/5 transition-all hover:scale-105"
                style={{ border: '1px solid rgba(201,166,70,0.2)' }}
              >
                <X className="w-5 h-5 text-[#C9A646]/50 hover:text-[#C9A646]" />
              </button>
            </div>

            {/* Discount Badge - if applicable */}
            {isMonthly && isTopSecretMember && (
              <div 
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.18) 0%, rgba(147,51,234,0.08) 100%)',
                  border: '1px solid rgba(147,51,234,0.4)',
                  boxShadow: '0 2px 10px rgba(147,51,234,0.15)'
                }}
              >
                <Crown className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-semibold tracking-wide">TOP SECRET DISCOUNT</span>
              </div>
            )}
            
            {/* Savings text - more prominent */}
            <p className="text-green-400 text-base font-semibold mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              {isMonthly && isTopSecretMember 
                ? `Save $${(CONFIG.MONTHLY_PRICE - CONFIG.MONTHLY_PRICE_TOPSECRET).toFixed(2)}/month!`
                : isMonthly 
                  ? 'Cancel anytime • Billed monthly'
                  : `~$${Math.round(CONFIG.YEARLY_MONTHLY_EQUIVALENT)}/mo • Save $${YEARLY_SAVINGS}/year`
              }
            </p>

            {/* What's Included - Enhanced horizontal layout */}
            <div 
              className="rounded-2xl p-5 mb-5"
              style={{ 
                background: 'linear-gradient(135deg, rgba(201,166,70,0.06) 0%, rgba(201,166,70,0.02) 100%)',
                border: '1px solid rgba(201,166,70,0.2)',
                boxShadow: 'inset 0 1px 0 rgba(244,217,123,0.05)'
              }}
            >
              <div className="flex items-center justify-around">
                {/* Daily */}
                <div className="flex flex-col items-center text-center group">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all group-hover:scale-105"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                      border: '1px solid rgba(201,166,70,0.25)'
                    }}
                  >
                    <FileText className="w-5 h-5 text-[#F4D97B]" />
                  </div>
                  <span className="text-white text-sm font-semibold">Daily</span>
                  <span className="text-[#C9A646]/50 text-xs">9 AM NY</span>
                </div>
                
                {/* Divider */}
                <div className="w-px h-14 bg-gradient-to-b from-transparent via-[#C9A646]/25 to-transparent" />
                
                {/* Weekly */}
                <div className="flex flex-col items-center text-center group">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all group-hover:scale-105"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                      border: '1px solid rgba(201,166,70,0.25)'
                    }}
                  >
                    <Calendar className="w-5 h-5 text-[#F4D97B]" />
                  </div>
                  <span className="text-white text-sm font-semibold">Weekly</span>
                  <span className="text-[#C9A646]/50 text-xs">Sunday</span>
                </div>
                
                {/* Divider */}
                <div className="w-px h-14 bg-gradient-to-b from-transparent via-[#C9A646]/25 to-transparent" />
                
                {/* Discord */}
                <div className="flex flex-col items-center text-center group">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all group-hover:scale-105"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                      border: '1px solid rgba(201,166,70,0.25)'
                    }}
                  >
                    <DiscordIcon className="w-5 h-5 text-[#F4D97B]" />
                  </div>
                  <span className="text-white text-sm font-semibold">Discord</span>
                  <span className="text-[#C9A646]/50 text-xs">847+</span>
                </div>
              </div>
            </div>

            {/* Trial/Value Badge - Enhanced */}
            <div 
              className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-5"
              style={{ 
                background: isMonthly 
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.03) 100%)',
                border: `1px solid ${isMonthly ? 'rgba(34,197,94,0.3)' : 'rgba(201,166,70,0.3)'}`,
                boxShadow: isMonthly 
                  ? '0 4px 15px rgba(34,197,94,0.08)' 
                  : '0 4px 15px rgba(201,166,70,0.08)'
              }}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isMonthly 
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.08) 100%)' 
                    : 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.08) 100%)',
                  border: `1px solid ${isMonthly ? 'rgba(34,197,94,0.3)' : 'rgba(201,166,70,0.3)'}`
                }}
              >
                {isMonthly 
                  ? <Shield className="w-5 h-5 text-green-400" />
                  : <TrendingUp className="w-5 h-5 text-[#F4D97B]" />
                }
              </div>
              <div>
                <p className={`font-bold text-base ${isMonthly ? 'text-green-400' : 'text-[#F4D97B]'}`}>
                  {isMonthly ? '7-Day Free Trial' : `Best Value – Save $${YEARLY_SAVINGS}`}
                </p>
                <p className="text-[#8B8175] text-sm">
                  {isMonthly ? 'Full access • No charge during trial' : 'Price locked forever'}
                </p>
              </div>
            </div>

            {/* Checkbox - Enhanced */}
            <label className="flex items-start gap-3 cursor-pointer mb-5 group p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
              <div className="relative flex-shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)} 
                  className="sr-only" 
                />
                <div 
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                    !agreed && "group-hover:border-[#C9A646]/70 group-hover:scale-105"
                  )}
                  style={{ 
                    background: agreed 
                      ? 'linear-gradient(135deg, #C9A646, #F4D97B)' 
                      : 'rgba(201,166,70,0.06)',
                    border: agreed ? 'none' : '2px solid rgba(201,166,70,0.4)',
                    boxShadow: agreed ? '0 0 15px rgba(201,166,70,0.4)' : 'none'
                  }}
                >
                  {agreed && <Check className="w-4 h-4 text-black" />}
                </div>
              </div>
              <span className="text-[#9A9080] text-sm leading-relaxed">
                I acknowledge that FINOTAUR does not provide investment advice. I agree to the{' '}
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }}
                  className="text-[#C9A646] hover:text-[#F4D97B] underline underline-offset-2 transition-colors font-medium"
                >
                  Terms & Disclaimer
                </button>
              </span>
            </label>

            {/* Buttons - Enhanced with better proportions */}
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl font-semibold text-base transition-all hover:bg-[#C9A646]/10 hover:scale-[1.02] active:scale-[0.98]"
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
                  "flex-[1.4] py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all",
                  agreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed opacity-50"
                )}
                style={agreed ? { 
                  background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                  boxShadow: '0 6px 25px rgba(201,166,70,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                  color: '#1a1510'
                } : {
                  background: 'rgba(201,166,70,0.12)',
                  color: 'rgba(201,166,70,0.35)'
                }}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Rocket className="w-5 h-5" />
                )}
                {isProcessing ? 'Processing...' : isMonthly ? 'Start Free Trial' : 'Subscribe Now'}
              </button>
            </div>
          </div>
          
          {/* Bottom accent line */}
          <div 
            className="absolute bottom-0 left-[5%] right-[5%] h-[2px]" 
            style={{ 
              background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.5), transparent)' 
            }} 
          />
        </div>
      </div>
    </div>
  );
});

export default DisclaimerPopup;