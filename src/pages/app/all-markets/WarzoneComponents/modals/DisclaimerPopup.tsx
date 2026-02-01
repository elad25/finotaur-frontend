// =====================================================
// PLAN SELECTION POPUP - v7.0
// Wide popup with two cards: Single Product vs Bundle
// OR Bundle-only for existing Top Secret members
// Shared disclaimer checkbox enables both buttons
// =====================================================

import { memo, useState } from 'react';
import { X, Crown, FileText, Calendar, Shield, Check, Loader2, Rocket, Sparkles, Gift } from 'lucide-react';
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
  onSelectBundle?: () => void;
  onSelectBundleYearly?: () => void;
}

const DisclaimerPopup = memo(function DisclaimerPopup({ 
  isOpen, onClose, onAccept, isProcessing, billingInterval, isTopSecretMember, onSelectBundle, onSelectBundleYearly
}: DisclaimerPopupProps) {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'single' | 'bundle' | null>(null);
  const [bundleTab, setBundleTab] = useState<'monthly' | 'yearly'>('monthly');
  
  const isMonthly = billingInterval === 'monthly';
  const displayPrice = isMonthly 
    ? (isTopSecretMember ? CONFIG.MONTHLY_PRICE_TOPSECRET : CONFIG.MONTHLY_PRICE) 
    : CONFIG.YEARLY_PRICE;
  const originalPrice = isMonthly ? CONFIG.MONTHLY_PRICE : null;
  
  // Show bundle option only for monthly billing
  const showBundleOption = isMonthly;
  
  // For Top Secret members on monthly - show ONLY bundle upgrade
  const showBundleOnly = isMonthly && isTopSecretMember;
  
  // For regular users on monthly - show both options side by side
  const showBothOptions = isMonthly && !isTopSecretMember;
  
  if (!isOpen) return null;

  const handleSingleClick = () => {
    if (!agreed) return;
    setSelectedOption('single');
    onAccept();
  };

  const handleBundleClick = () => {
    if (!agreed || !onSelectBundle) return;
    setSelectedOption('bundle');
    if (bundleTab === 'yearly' && onSelectBundleYearly) {
      onSelectBundleYearly();
    } else {
      onSelectBundle();
    }
  };

  // ============================================
  // BUNDLE-ONLY VIEW (For Top Secret Members)
  // ============================================
  if (showBundleOnly) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center py-8 px-4">
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        
        <div 
          className="absolute inset-0 backdrop-blur-md" 
          style={{ background: 'rgba(0,0,0,0.88)' }} 
          onClick={onClose} 
        />
        
        <div className="relative w-full max-w-sm max-h-[calc(100vh-160px)] overflow-hidden mt-12">
          {/* Glow effects */}
          <div 
            className="absolute -inset-[2px] rounded-2xl opacity-70 animate-pulse" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(244,217,123,0.5) 0%, rgba(201,166,70,0.2) 25%, transparent 50%, rgba(201,166,70,0.2) 75%, rgba(244,217,123,0.5) 100%)',
              filter: 'blur(10px)',
              animationDuration: '3s'
            }} 
          />
          <div 
            className="absolute -inset-[1px] rounded-2xl" 
            style={{ background: 'linear-gradient(180deg, rgba(244,217,123,0.3) 0%, transparent 30%, transparent 70%, rgba(201,166,70,0.2) 100%)' }} 
          />
          
          <div 
            className="relative rounded-2xl overflow-hidden"
            style={{ 
              background: 'linear-gradient(180deg, rgba(32,28,20,0.99) 0%, rgba(18,15,11,1) 100%)',
              border: '1px solid rgba(201,166,70,0.4)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(244,217,123,0.1)'
            }}
          >
            {/* Top accent line */}
            <div 
              className="absolute top-0 left-[5%] right-[5%] h-[2px]" 
              style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.8), transparent)' }} 
            />

            <div className="px-5 pt-5 pb-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                     style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">Special Offer for Top Secret Members</span>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                  style={{ border: '1px solid rgba(201,166,70,0.2)' }}
                >
                  <X className="w-4 h-4 text-[#C9A646]/50 hover:text-[#C9A646]" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-white text-center mb-4">Upgrade to Bundle</h2>
              
              <p className="text-slate-400 text-center text-sm mb-3">
                Get <span className="text-white font-semibold">both War Zone + Top Secret</span> for one low price!
              </p>

              {/* Monthly / Yearly Tabs */}
              <div className="flex rounded-xl overflow-hidden border border-[#C9A646]/30 mb-4">
                <button
                  onClick={() => setBundleTab('monthly')}
                  className="flex-1 py-2.5 text-sm font-semibold transition-all"
                  style={bundleTab === 'monthly' ? {
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                    color: '#000',
                  } : {
                    background: 'transparent',
                    color: '#C9A646',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBundleTab('yearly')}
                  className="flex-1 py-2.5 text-sm font-semibold transition-all"
                  style={bundleTab === 'yearly' ? {
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                    color: '#000',
                  } : {
                    background: 'transparent',
                    color: '#C9A646',
                  }}
                >
                  Yearly
                  <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={bundleTab === 'yearly' ? {
                      background: 'rgba(0,0,0,0.2)',
                      color: '#000',
                    } : {
                      background: 'rgba(16,185,129,0.2)',
                      color: '#10B981',
                    }}
                  >
                    SAVE $218
                  </span>
                </button>
              </div>
              
              {/* Price Section — Dynamic based on tab */}
              {bundleTab === 'monthly' ? (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                    <span className="text-slate-400 text-sm">War Zone Newsletter</span>
                    <span className="text-slate-500 line-through text-sm">$69.99/mo</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                    <span className="text-slate-400 text-sm">Top Secret Reports</span>
                    <span className="text-slate-500 line-through text-sm">$89.99/mo</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg"
                       style={{ 
                         background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                         border: '1px solid rgba(201,166,70,0.3)'
                       }}>
                    <div>
                      <span className="text-[#C9A646] font-bold">Bundle Price</span>
                      <p className="text-emerald-400 text-xs">Save $50.98/month!</p>
                    </div>
                    <span className="text-[#C9A646] font-bold text-xl">$109/mo</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                    <span className="text-slate-400 text-sm">Monthly Bundle × 12</span>
                    <span className="text-slate-500 line-through text-sm">$1,308/yr</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg"
                       style={{ 
                         background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                         border: '1px solid rgba(201,166,70,0.3)'
                       }}>
                    <div>
                      <span className="text-[#C9A646] font-bold">Yearly Bundle</span>
                      <p className="text-emerald-400 text-xs">Just $90.83/mo — Save $218!</p>
                    </div>
                    <span className="text-[#C9A646] font-bold text-xl">$1,090/yr</span>
                  </div>
                </div>
              )}
              
              {/* What You Get */}
              <div className="space-y-1.5 mb-4">
                <p className="text-slate-500 text-xs font-medium mb-1">What you'll get:</p>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>War Zone Newsletter (Daily Signals)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Top Secret Reports (10 Monthly)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{bundleTab === 'monthly' ? '7-Day Free Trial' : 'Full Year Access'}</span>
                </div>
                {bundleTab === 'yearly' && (
                  <>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Check className="w-3.5 h-3.5 text-[#C9A646]" />
                      <span>Locked price for 12 months</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Check className="w-3.5 h-3.5 text-[#C9A646]" />
                      <span>Founding member badge</span>
                    </div>
                  </>
                )}
              </div>

              {/* Disclaimer Checkbox - Premium Style */}
              <div 
                className="rounded-xl p-3 mb-4 relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.03) 100%)',
                  border: '1px solid rgba(201,166,70,0.25)',
                  boxShadow: 'inset 0 1px 0 rgba(244,217,123,0.08), 0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.3), transparent)' }}
                />
                
                <label className="flex items-start gap-2.5 cursor-pointer group relative z-10">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={agreed} 
                      onChange={(e) => setAgreed(e.target.checked)} 
                      className="sr-only" 
                    />
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200",
                        !agreed && "group-hover:border-[#C9A646]/70 group-hover:scale-110"
                      )}
                      style={{ 
                        background: agreed 
                          ? 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)' 
                          : 'rgba(201,166,70,0.08)',
                        border: agreed ? 'none' : '2px solid rgba(201,166,70,0.4)',
                        boxShadow: agreed 
                          ? '0 0 20px rgba(201,166,70,0.5), inset 0 1px 0 rgba(255,255,255,0.3)' 
                          : 'inset 0 1px 2px rgba(0,0,0,0.2)'
                      }}
                    >
                      {agreed && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-[#A09080] text-sm leading-relaxed">
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
              </div>
              
              {/* CTA Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleBundleClick}
                  disabled={!agreed || isProcessing}
                  className={cn(
                    "w-full py-3 text-base font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                    agreed ? "hover:scale-[1.02]" : "cursor-not-allowed"
                  )}
                  style={agreed ? {
                    background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                    color: '#1a1510',
                    boxShadow: '0 6px 25px rgba(201,166,70,0.45), inset 0 1px 0 rgba(255,255,255,0.2)'
                  } : {
                    background: 'rgba(201,166,70,0.15)',
                    color: 'rgba(201,166,70,0.4)'
                  }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
<>
                    <Crown className="w-4 h-4" />
                    {bundleTab === 'monthly' ? 'Start Free Trial — $109/mo' : 'Get Yearly Bundle — $1,090/yr'}
                  </>
                  )}
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full py-2 text-slate-500 hover:text-slate-400 transition-colors text-sm"
                >
                  No thanks, I'll pass
                </button>
              </div>
            </div>
            
            {/* Bottom accent */}
            <div 
              className="absolute bottom-0 left-[5%] right-[5%] h-[2px]" 
              style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.5), transparent)' }} 
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // DUAL OPTIONS VIEW (WAR ZONE + Bundle side by side)
  // OR Single option for yearly billing
  // ============================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center py-8 px-4">
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      
      <div 
        className="absolute inset-0 backdrop-blur-md" 
        style={{ background: 'rgba(0,0,0,0.88)' }} 
        onClick={onClose} 
      />
      
      {/* Popup Card - Wide for two columns, narrow for single */}
      <div className={cn(
        "relative w-full max-h-[calc(100vh-160px)] overflow-hidden mt-12",
        showBothOptions ? "max-w-3xl" : "max-w-sm"
      )}>
        {/* Glow effects */}
        <div 
          className="absolute -inset-[2px] rounded-2xl opacity-70 animate-pulse" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(244,217,123,0.5) 0%, rgba(201,166,70,0.2) 25%, transparent 50%, rgba(201,166,70,0.2) 75%, rgba(244,217,123,0.5) 100%)',
            filter: 'blur(10px)',
            animationDuration: '3s'
          }} 
        />
        <div 
          className="absolute -inset-[1px] rounded-2xl" 
          style={{ background: 'linear-gradient(180deg, rgba(244,217,123,0.3) 0%, transparent 30%, transparent 70%, rgba(201,166,70,0.2) 100%)' }} 
        />
        
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(180deg, rgba(32,28,20,0.99) 0%, rgba(18,15,11,1) 100%)',
            border: '1px solid rgba(201,166,70,0.4)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(244,217,123,0.1)'
          }}
        >
          {/* Top accent line */}
          <div 
            className="absolute top-0 left-[5%] right-[5%] h-[2px]" 
            style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.8), transparent)' }} 
          />
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle at top left, rgba(244,217,123,0.08) 0%, transparent 70%)' }}
          />
          <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle at top right, rgba(244,217,123,0.08) 0%, transparent 70%)' }}
          />

          <div className="px-6 pt-5 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 
                  className="text-xl font-bold tracking-wide"
                  style={{ 
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #E5E5E5 100%)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent' 
                  }}
                >
                  {showBothOptions ? 'Choose Your Plan' : 'WAR ZONE'}
                </h2>
                <p className="text-[#8B8175] text-sm mt-0.5">
                  {showBothOptions ? 'Save more with the Ultimate Bundle!' : 'Start your 7-day free trial'}
                </p>
              </div>
              
              <button 
                onClick={onClose} 
                className="p-2 rounded-lg hover:bg-white/5 transition-all hover:scale-105"
                style={{ border: '1px solid rgba(201,166,70,0.2)' }}
              >
                <X className="w-5 h-5 text-[#C9A646]/50 hover:text-[#C9A646]" />
              </button>
            </div>

            {/* Two Column Cards (or single if yearly) */}
            <div className={cn(
              "grid gap-4 mb-5",
              showBothOptions ? "md:grid-cols-2" : "grid-cols-1"
            )}>
              
              {/* Card 1: WAR ZONE Single */}
              <div 
                className="rounded-xl p-5 flex flex-col"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {/* Badge */}
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/50">
                    <FileText className="w-3 h-3" />
                    WAR ZONE ONLY
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-3">War Zone Newsletter</h3>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">${displayPrice}</span>
                    <span className="text-slate-500 text-sm">/{isMonthly ? 'mo' : 'yr'}</span>
                  </div>
                  <p className="text-emerald-400 text-xs font-medium mt-1">
                    {isMonthly ? '7-Day Free Trial' : `Save $${YEARLY_SAVINGS}/year`}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-4 flex-grow">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Daily Market Briefing (9AM NY)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Weekly Deep Dive Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Private Discord (847+ traders)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Trading Room Access</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button 
                  onClick={handleSingleClick}
                  disabled={!agreed || (isProcessing && selectedOption === 'single')}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    agreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed"
                  )}
                  style={agreed ? { 
                    background: 'linear-gradient(135deg, #404040 0%, #303030 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                  } : {
                    background: 'rgba(60,60,60,0.3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.3)'
                  }}
                >
                  {isProcessing && selectedOption === 'single' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {isProcessing && selectedOption === 'single' ? 'Processing...' : isMonthly ? 'Start Free Trial' : 'Subscribe Now'}
                </button>
              </div>

              {/* Card 2: Bundle (Only shown for monthly, non-TopSecret users) */}
              {showBothOptions && (
                <div 
                  className="rounded-xl p-5 flex flex-col relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)',
                    border: '2px solid rgba(201,166,70,0.4)',
                    boxShadow: '0 0 30px rgba(201,166,70,0.15)'
                  }}
                >
                  {/* Best Value Badge */}
                  <div className="absolute -top-0 right-4">
                    <div 
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-b-lg text-[10px] font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                        color: '#000'
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      BEST VALUE
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="mb-3 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                      style={{
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        color: '#34d399'
                      }}
                    >
                      <Gift className="w-3 h-3" />
                      ULTIMATE BUNDLE
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white mb-3">War Zone + Top Secret</h3>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-slate-500 line-through">$159.98</span>
                      <span 
                        className="text-3xl font-bold"
                        style={{ 
                          background: 'linear-gradient(180deg, #F4D97B 0%, #C9A646 100%)', 
                          WebkitBackgroundClip: 'text', 
                          WebkitTextFillColor: 'transparent' 
                        }}
                      >
                        $109
                      </span>
                      <span className="text-slate-500 text-sm">/mo</span>
                    </div>
                    <p className="text-emerald-400 text-xs font-semibold mt-1">
                      Save $50.98/month!
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-4 flex-grow">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>War Zone Newsletter (Daily)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Top Secret Reports (10 Monthly)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Private Discord + Trading Room</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>7-Day Free Trial</span>
                    </div>
                  </div>

                  {/* CTA Button - Premium Gold */}
                  <button 
                    onClick={handleBundleClick}
                    disabled={!agreed || (isProcessing && selectedOption === 'bundle')}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                      agreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed"
                    )}
                    style={agreed ? { 
                      background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                      boxShadow: '0 6px 25px rgba(201,166,70,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                      color: '#1a1510'
                    } : {
                      background: 'rgba(201,166,70,0.15)',
                      color: 'rgba(201,166,70,0.4)'
                    }}
                  >
                    {isProcessing && selectedOption === 'bundle' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4" />
                    )}
                    {isProcessing && selectedOption === 'bundle' ? 'Processing...' : 'Get Bundle for $109/mo'}
                  </button>
                </div>
              )}
            </div>

            {/* Shared Disclaimer Checkbox - Premium Style */}
            <div 
              className="rounded-xl p-4 mb-4 relative overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.03) 100%)',
                border: '1px solid rgba(201,166,70,0.25)',
                boxShadow: 'inset 0 1px 0 rgba(244,217,123,0.08), 0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              {/* Inner glow effect */}
              <div 
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.3), transparent)' }}
              />
              
              <label className="flex items-start gap-3 cursor-pointer group relative z-10">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={agreed} 
                    onChange={(e) => setAgreed(e.target.checked)} 
                    className="sr-only" 
                  />
                  <div 
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200",
                      !agreed && "group-hover:border-[#C9A646]/70 group-hover:scale-110"
                    )}
                    style={{ 
                      background: agreed 
                        ? 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)' 
                        : 'rgba(201,166,70,0.08)',
                      border: agreed ? 'none' : '2px solid rgba(201,166,70,0.4)',
                      boxShadow: agreed 
                        ? '0 0 20px rgba(201,166,70,0.5), inset 0 1px 0 rgba(255,255,255,0.3)' 
                        : 'inset 0 1px 2px rgba(0,0,0,0.2)'
                    }}
                  >
                    {agreed && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-[#A09080] text-sm leading-relaxed">
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
            </div>

            {/* Cancel Button */}
            <button 
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-[#C9A646]/10"
              style={{ 
                background: 'transparent',
                border: '1px solid rgba(201,166,70,0.2)',
                color: '#8B8175'
              }}
            >
              Cancel
            </button>
          </div>
          
          {/* Bottom accent line */}
          <div 
            className="absolute bottom-0 left-[5%] right-[5%] h-[2px]" 
            style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.5), transparent)' }} 
          />
        </div>
      </div>
    </div>
  );
});

export default DisclaimerPopup;