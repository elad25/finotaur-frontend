// src/components/AffiliatePopup.tsx
import { memo, useCallback, useMemo } from 'react';
import { X, Copy, Check, Users, TrendingUp, Gift, Calendar, Link2, Loader2 } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface AffiliatePopupProps {
  onClose: () => void;
}

// ============================================
// 🔥 MEMOIZED SUB-COMPONENTS - למנוע re-renders מיותרים
// ============================================

const StatCard = memo(({ 
  icon: Icon, 
  label, 
  value, 
  color = '#F4F4F4' 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color?: string;
}) => (
  <div 
    className="bg-[#0F0F0F] border border-[#C9A646]/10 rounded-[14px] p-4 hover:border-[#C9A646]/20 transition-all duration-300"
    style={{ boxShadow: '0 0 15px rgba(201,166,70,0.05)' }}
  >
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="w-4 h-4" style={{ color: color === '#F4F4F4' ? '#C9A646' : color }} />
      <span className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
    <div className="text-2xl font-bold" style={{ color }}>
      {value}
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

const CopyButton = memo(({ 
  value, 
  label, 
  isMono = false 
}: { 
  value: string; 
  label: string; 
  isMono?: boolean;
}) => {
  const { copied, copy } = useCopyToClipboard(value);

  return (
    <div 
      className="bg-[#0F0F0F] border border-[#C9A646]/10 rounded-[14px] p-3.5"
      style={{ boxShadow: '0 0 15px rgba(201,166,70,0.05)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-6 h-6 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
          <Link2 className="w-3 h-3 text-[#C9A646]" />
        </div>
        <span className="text-[10px] text-[#A0A0A0] font-medium">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[#0A0A0A] border border-[#C9A646]/20 rounded-lg px-3 py-2.5 overflow-hidden">
          <code 
            className={`${
              isMono 
                ? 'text-[#C9A646] text-base font-mono font-bold tracking-wider' 
                : 'text-[#A0A0A0] text-[10px] font-mono'
            } truncate block`}
          >
            {value}
          </code>
        </div>
        <button
          onClick={copy}
          className="px-3 py-2.5 bg-[#C9A646]/10 hover:bg-[#C9A646]/20 border border-[#C9A646]/30 text-[#C9A646] rounded-lg transition-all duration-200 flex items-center gap-1.5 font-medium text-xs whitespace-nowrap"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
});

CopyButton.displayName = 'CopyButton';

const HowItWorksStep = memo(({ 
  number, 
  children 
}: { 
  number: number; 
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-2.5">
    <div className="w-5 h-5 rounded-full bg-[#C9A646]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-[#C9A646] text-[10px] font-bold">{number}</span>
    </div>
    <p className="text-[#A0A0A0] text-xs leading-relaxed">{children}</p>
  </div>
));

HowItWorksStep.displayName = 'HowItWorksStep';

// ============================================
// 🔥 MAIN COMPONENT - OPTIMIZED
// ============================================

function AffiliatePopup({ onClose }: AffiliatePopupProps) {
  const { loading, affiliateData, error } = useAffiliate();

  // ✅ Memoized date formatter
  const nextBillingDateFormatted = useMemo(() => {
    if (!affiliateData?.next_billing_date) return 'N/A';
    return new Date(affiliateData.next_billing_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [affiliateData?.next_billing_date]);

  // ✅ Memoized subscription label
  const subscriptionLabel = useMemo(() => {
    if (!affiliateData) return 'Free';
    
    const { account_type, subscription_interval } = affiliateData;
    
    if (account_type === 'free') return 'Free';
    
    const typeLabel = account_type === 'basic' ? 'Basic' : 'Premium';
    const intervalLabel = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
    
    return `${typeLabel} (${intervalLabel})`;
  }, [affiliateData?.account_type, affiliateData?.subscription_interval]);

  // ✅ Prevent backdrop clicks from bubbling
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-[#0A0A0A] border border-[#C9A646]/20 rounded-[18px] max-w-4xl w-full shadow-[0_0_60px_rgba(201,166,70,0.25)] animate-fadeIn overflow-hidden"
        style={{
          boxShadow: '0 0 60px rgba(201,166,70,0.25), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        {/* Header */}
        <div 
          className="relative px-6 py-4 border-b border-[#C9A646]/10"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.02) 100%)'
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#A0A0A0] hover:text-[#F4F4F4] transition-colors p-1.5 hover:bg-[#1A1A1A] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A646] to-[#E5C158] flex items-center justify-center shadow-[0_0_15px_rgba(201,166,70,0.4)]">
              <Gift className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F4F4F4] tracking-tight">Refer & Earn</h2>
              <p className="text-[#A0A0A0] text-xs">Share Finotaur and earn free months</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#C9A646] animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : affiliateData ? (
            <div className="space-y-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard 
                  icon={Users} 
                  label="Signups" 
                  value={affiliateData.total_signups}
                  color="#F4F4F4"
                />
                <StatCard 
                  icon={TrendingUp} 
                  label="Paid" 
                  value={affiliateData.total_conversions} 
                  color="#4AD295" 
                />
                <StatCard 
                  icon={Gift} 
                  label="Free" 
                  value={affiliateData.free_months_available}
                  color="#C9A646"
                />
              </div>

              {/* 2 Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column */}
                <div className="space-y-3">
                  <CopyButton 
                    value={affiliateData.affiliate_code} 
                    label="Your Referral Code"
                    isMono
                  />
                  
                  <CopyButton 
                    value={affiliateData.referral_url} 
                    label="Your Referral Link"
                  />

                  {/* Next Billing Info */}
                  {affiliateData.account_type !== 'free' && (
                    <div 
                      className="bg-gradient-to-r from-[#C9A646]/10 to-[#C9A646]/5 border border-[#C9A646]/20 rounded-[14px] p-3.5"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-[#C9A646]" />
                        <span className="text-[10px] text-[#F4F4F4] font-semibold">Next Billing Date</span>
                      </div>
                      
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-lg font-bold text-[#C9A646]">
                          {nextBillingDateFormatted}
                        </span>
                        {affiliateData.free_months_available > 0 && (
                          <span className="text-[10px] text-[#4AD295] font-medium">
                            (+{affiliateData.free_months_available} free)
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[9px] text-[#A0A0A0]">
                        Current Plan: <span className="text-[#F4F4F4] font-medium">{subscriptionLabel}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - How It Works */}
                <div 
                  className="bg-[#0F0F0F] border border-[#C9A646]/10 rounded-[14px] p-4"
                  style={{ boxShadow: '0 0 15px rgba(201,166,70,0.05)' }}
                >
                  <h3 className="text-[#F4F4F4] font-semibold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646]"></span>
                    How It Works
                  </h3>
                  
                  <div className="space-y-3">
                    <HowItWorksStep number={1}>
                      Share your referral link or code with friends
                    </HowItWorksStep>
                    
                    <HowItWorksStep number={2}>
                      Your friend gets <span className="text-[#4AD295] font-semibold">20% off</span> their first payment
                    </HowItWorksStep>
                    
                    <HowItWorksStep number={3}>
                      You get <span className="text-[#C9A646] font-semibold">1 free month</span> added to your subscription
                    </HowItWorksStep>
                    
                    <HowItWorksStep number={4}>
                      Free months stack automatically - no limit!
                    </HowItWorksStep>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#C9A646]/10 bg-[#0A0A0A]">
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 bg-[#C9A646] hover:bg-[#E5C158] text-black font-semibold rounded-lg transition-colors duration-200 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(AffiliatePopup);