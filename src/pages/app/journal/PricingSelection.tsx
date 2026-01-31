// =====================================================
// WAR ZONE PRICING SELECTION PAGE
// Post-signup checkout page for WAR ZONE
// Styled like TOP SECRET PricingSelection
// =====================================================

import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Crown, Shield, LogOut, Check, Clock, ArrowRight, ChevronRight,
  FileText, Calendar, Headphones, Zap, X, Loader2, Rocket, Sparkles, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import { cn } from '@/lib/utils';

// Lazy load Terms Modal from WarzoneComponents
const TermsModal = lazy(() => import('../all-markets/WarzoneComponents/modals/TermsModal'));


// =====================================================
// CONFIGURATION
// =====================================================
const WHOP_MONTHLY_PLAN_ID = 'plan_U6lF2eO5y9469'; // WAR ZONE Monthly
const WHOP_YEARLY_PLAN_ID = 'plan_bp2QTGuwfpj0A'; // WAR ZONE Yearly
const MONTHLY_PRICE = 69.99;
const YEARLY_PRICE = 699;
const YEARLY_SAVINGS = Math.round((MONTHLY_PRICE * 12) - YEARLY_PRICE);
const YEARLY_MONTHLY_EQUIVALENT = Math.round(YEARLY_PRICE / 12);

// 🔥 v5.0.0: Bundle Configuration
const WHOP_BUNDLE_MONTHLY_PLAN_ID = 'plan_ICooR8aqtdXad'; // Bundle Monthly
const WHOP_BUNDLE_YEARLY_PLAN_ID = 'plan_M2zS1EoNXJF10';  // Bundle Yearly
const BUNDLE_MONTHLY_PRICE = 109;
const BUNDLE_YEARLY_PRICE = 1090;

// =====================================================
// ICONS
// =====================================================
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// =====================================================
// COMPONENT
// =====================================================
export default function WarZonePricingSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [pendingBillingInterval, setPendingBillingInterval] = useState<'monthly' | 'yearly' | null>(null);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('WAR ZONE checkout initiated');
    },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    }
  });

  // =====================================================
  // Check subscription status and handle redirects
  // =====================================================
  useEffect(() => {
    const checkSubscription = async () => {
      // 🔥 FIX: Don't redirect to register immediately
      // Wait for auth state to be determined first
      // This prevents redirect loop when user clicks "back" from Whop checkout
      
      setCheckingSubscription(true);

      // Give auth state time to load (prevents flash redirect)
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!user) {
        // Check if there's a session being loaded
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('No user session, redirecting to register');
          navigate('/auth/register');
          return;
        }
        
        // Session exists but user state not yet updated - wait
        console.log('Session exists, waiting for user state...');
        setCheckingSubscription(false);
        return;
      }

      try {
        const paymentSuccess = searchParams.get('payment') === 'success';
        const fromWhop = searchParams.get('source') === 'whop';

        const { data, error } = await supabase
          .from('profiles')
          .select(`
            newsletter_enabled,
            newsletter_status,
            onboarding_completed
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking subscription:', error);
          setCheckingSubscription(false);
          return;
        }

        if (paymentSuccess || fromWhop) {
          window.history.replaceState({}, '', '/warzone-pricing');

          await supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          await createWelcomeNotification(user.id);

          toast.success('Welcome to WAR ZONE!', {
            description: 'Your subscription is being activated...'
          });

          navigate('/app/all-markets/warzone?payment=success&source=whop&new_subscriber=true');
          return;
        }

        const hasWarZone = data?.newsletter_status === 'active' && data?.newsletter_enabled === true;

        if (hasWarZone) {
          navigate('/app/all-markets/warzone');
          return;
        }

        setCheckingSubscription(false);

      } catch (error) {
        console.error('Error checking subscription:', error);
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, navigate, searchParams]);

  // =====================================================
  // Create welcome notification
  // =====================================================
  const createWelcomeNotification = async (userId: string) => {
    try {
      await supabase
        .from('system_updates')
        .insert({
          title: 'Welcome to WAR ZONE!',
          content: 'Your 7-day free trial has started. Check your email for upcoming daily briefing alerts.',
          type: 'success',
          target_group: 'newsletter',
          is_active: true,
          metadata: {
            report_type: 'welcome',
            user_id: userId
          }
        });
    } catch (error) {
      console.error('Error creating welcome notification:', error);
    }
  };

  // =====================================================
  // Handle Payment - Show disclaimer popup first
  // =====================================================
  const handlePayment = (billingInterval: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    // Show disclaimer popup instead of going directly to checkout
    setPendingBillingInterval(billingInterval);
    setSelectedPlan(billingInterval);
    setDisclaimerAgreed(false);
    setShowDisclaimer(true);
  };

  // Handle actual checkout after disclaimer is accepted
  const handleProceedToCheckout = async () => {
    if (!pendingBillingInterval || !disclaimerAgreed) return;
    
    setShowDisclaimer(false);
    
    await initiateCheckout({
      planName: 'newsletter',
      billingInterval: pendingBillingInterval,
    });
  };

  // =====================================================
  // Handle Go to App
  // =====================================================
  const handleGoToApp = async () => {
    if (!user) {
      navigate('/app/all-markets/warzone');
      return;
    }

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      navigate('/app/all-markets/warzone');
    } catch (error) {
      console.error('Error navigating to app:', error);
      navigate('/app/all-markets/warzone');
    }
  };

  // =====================================================
  // Handle exit
  // =====================================================
  const handleExit = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  // =====================================================
  // LOADING STATE
  // =====================================================
  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

// =====================================================
  // DISCLAIMER POPUP COMPONENT - v2.0 with Bundle options
  // =====================================================
  const DisclaimerPopup = () => {
    if (!showDisclaimer) return null;
    
    const isMonthly = pendingBillingInterval === 'monthly';
    
    // Show bundle option for both monthly AND yearly
    const showBundleOption = true;
    
    // Single product prices
    const singlePrice = isMonthly ? MONTHLY_PRICE : YEARLY_PRICE;
    const singleSavings = isMonthly ? null : YEARLY_SAVINGS;
    const singleMonthlyEquivalent = isMonthly ? null : YEARLY_MONTHLY_EQUIVALENT;
    
    // Bundle prices
    const bundlePrice = isMonthly ? BUNDLE_MONTHLY_PRICE : BUNDLE_YEARLY_PRICE;
    const bundleSavings = isMonthly ? 50.98 : 218; // Monthly: $159.98 - $109 = $50.98, Yearly: $1308 - $1090 = $218
    const bundleMonthlyEquivalent = isMonthly ? null : Math.round(BUNDLE_YEARLY_PRICE / 12);
    
    // Handler for single product checkout
    const handleSingleCheckout = () => {
      if (!disclaimerAgreed) return;
      setShowDisclaimer(false);
      initiateCheckout({
        planName: 'newsletter',
        billingInterval: pendingBillingInterval!,
      });
    };
    
    // Handler for bundle checkout
    const handleBundleCheckout = () => {
      if (!disclaimerAgreed) return;
      setShowDisclaimer(false);
      initiateCheckout({
        planName: 'bundle' as any,
        billingInterval: pendingBillingInterval!,
      });
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center py-8 px-4">
        <Suspense fallback={null}>
          <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </Suspense>
        
        {/* Backdrop */}
        <div 
          className="absolute inset-0 backdrop-blur-md" 
          style={{ background: 'rgba(0,0,0,0.88)' }} 
          onClick={() => setShowDisclaimer(false)} 
        />
        
        {/* Popup Card - Wide for two columns */}
        <div className="relative w-full max-w-3xl max-h-[calc(100vh-160px)] overflow-hidden mt-12">
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
                    Choose Your Plan
                  </h2>
                  <p className="text-[#8B8175] text-sm mt-0.5">
                    Save more with the Ultimate Bundle!
                  </p>
                </div>
                <button 
                  onClick={() => setShowDisclaimer(false)} 
                  className="p-2 rounded-lg hover:bg-white/5 transition-all hover:scale-105"
                  style={{ border: '1px solid rgba(201,166,70,0.2)' }}
                >
                  <X className="w-5 h-5 text-[#C9A646]/50 hover:text-[#C9A646]" />
                </button>
              </div>

              {/* Two Column Cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-5">
                
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
                      <span className="text-3xl font-bold text-white">${singlePrice}</span>
                      <span className="text-slate-500 text-sm">/{isMonthly ? 'mo' : 'yr'}</span>
                    </div>
                    <p className="text-emerald-400 text-xs font-medium mt-1">
                      {isMonthly ? '7-Day Free Trial' : `Save $${singleSavings}/year (~$${singleMonthlyEquivalent}/mo)`}
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
                    onClick={handleSingleCheckout}
                    disabled={!disclaimerAgreed || isLoading}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                      disclaimerAgreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed"
                    )}
                    style={disclaimerAgreed ? { 
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
                    {isLoading && selectedPlan === pendingBillingInterval ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    {isMonthly ? 'Start Free Trial' : 'Subscribe Now'}
                  </button>
                </div>

                {/* Card 2: Bundle */}
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
                      <span className="text-sm text-slate-500 line-through">
                        {isMonthly ? '$159.98' : '$1,308'}
                      </span>
                      <span 
                        className="text-3xl font-bold"
                        style={{ 
                          background: 'linear-gradient(180deg, #F4D97B 0%, #C9A646 100%)', 
                          WebkitBackgroundClip: 'text', 
                          WebkitTextFillColor: 'transparent' 
                        }}
                      >
                        ${bundlePrice}
                      </span>
                      <span className="text-slate-500 text-sm">/{isMonthly ? 'mo' : 'yr'}</span>
                    </div>
                    <p className="text-emerald-400 text-xs font-semibold mt-1">
                      {isMonthly 
                        ? `Save $${bundleSavings}/month!` 
                        : `Save $${bundleSavings}/year! (~$${bundleMonthlyEquivalent}/mo)`
                      }
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
                      <span>{isMonthly ? '7-Day Free Trial' : 'Full Year Access'}</span>
                    </div>
                  </div>

                  {/* CTA Button - Premium Gold */}
                  <button 
                    onClick={handleBundleCheckout}
                    disabled={!disclaimerAgreed || isLoading}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                      disclaimerAgreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed"
                    )}
                    style={disclaimerAgreed ? { 
                      background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                      boxShadow: '0 6px 25px rgba(201,166,70,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                      color: '#1a1510'
                    } : {
                      background: 'rgba(201,166,70,0.15)',
                      color: 'rgba(201,166,70,0.4)'
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4" />
                    )}
                    {isMonthly ? `Get Bundle for $${bundlePrice}/mo` : `Get Bundle for $${bundlePrice}/yr`}
                  </button>
                </div>
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
                      checked={disclaimerAgreed} 
                      onChange={(e) => setDisclaimerAgreed(e.target.checked)} 
                      className="sr-only" 
                    />
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200",
                        !disclaimerAgreed && "group-hover:border-[#C9A646]/70 group-hover:scale-110"
                      )}
                      style={{ 
                        background: disclaimerAgreed 
                          ? 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)' 
                          : 'rgba(201,166,70,0.08)',
                        border: disclaimerAgreed ? 'none' : '2px solid rgba(201,166,70,0.4)',
                        boxShadow: disclaimerAgreed 
                          ? '0 0 20px rgba(201,166,70,0.5), inset 0 1px 0 rgba(255,255,255,0.3)' 
                          : 'inset 0 1px 2px rgba(0,0,0,0.2)'
                      }}
                    >
                      {disclaimerAgreed && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
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
                onClick={() => setShowDisclaimer(false)}
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
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <section className="min-h-screen py-12 px-4 relative overflow-hidden bg-[#0A0A0A]"> 
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#12100D] to-[#0B0B0B]" />

      {/* Main Golden Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201,166,70,0.15) 0%, rgba(180,140,50,0.08) 30%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      {/* Go to App Button - Top Left */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="outline"
          onClick={handleGoToApp}
          className="flex items-center gap-2 text-[#C9A646] border-[#C9A646]/50 hover:border-[#C9A646] hover:bg-[#C9A646]/10 transition-all font-semibold px-5 py-2"
        >
          <ArrowRight className="h-5 w-5 rotate-180" />
          GO TO APP
        </Button>
      </div>

      {/* Exit Button - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          onClick={handleExit}
          className="flex items-center gap-2 text-white border-white/30 hover:border-white/60 hover:bg-white/10 transition-all font-semibold px-5 py-2"
        >
          EXIT
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 pt-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          {/* Daily Intelligence Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
              border: '1px solid rgba(201,166,70,0.4)',
              boxShadow: '0 0 40px rgba(201,166,70,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}>
            <Crown className="w-5 h-5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold tracking-wide">Daily Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-3" style={{ letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            <span className="text-white">Get the Same Market Intel</span>
            <br />
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              Wall Street Desks Use
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mt-4">
            Wake up every morning with clarity.<br />
            Know exactly what matters before the market opens.
          </p>
        </motion.div>

        {/* LIMITED TIME OFFER Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-3xl mx-auto mb-3"
        >
          <div
            className="p-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.1) 100%)',
              border: '2px solid rgba(201,166,70,0.5)',
              boxShadow: '0 0 40px rgba(201,166,70,0.25)'
            }}
          >
            <Clock className="w-5 h-5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-bold text-lg">LIMITED TIME OFFER: 7 DAYS FREE TRIAL</span>
            <ChevronRight className="w-5 h-5 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* SUBSCRIBE RISK-FREE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mb-10"
        >
          <p className="text-slate-300 text-base">
            <span className="font-bold text-white">SUBSCRIBE RISK-FREE</span>: Cancel anytime, no questions asked.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8"
        >
          {/* Monthly Card */}
          <div
            className="relative p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.4)',
              boxShadow: '0 0 40px rgba(201,166,70,0.15)'
            }}
          >
            {/* MONTHLY Badge */}
            <div className="absolute -top-3 left-8">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                MONTHLY
              </div>
            </div>

            <div className="pt-6">
              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline justify-start gap-2 mb-1">
                  <span className="text-5xl font-bold text-white">${MONTHLY_PRICE}</span>
                  <span className="text-xl text-slate-400">/month</span>
                </div>
                <p className="text-sm font-bold text-blue-400 mb-1">
                  FREE 7 DAY TRIAL
                </p>
                <p className="text-emerald-400 text-base font-semibold">
                  First 7 days completely free!
                </p>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handlePayment('monthly')}
                disabled={isLoading}
                className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                }}
              >
                {isLoading && selectedPlan === 'monthly' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Redirecting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    START FREE TRIAL
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500 mb-6">
                Risk-free. Cancel anytime.
              </p>

              {/* Features */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                {/* Feature 1 */}
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Daily Market Briefing</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    9:00 AM NY — before market opens. Everything you need to know in one place.
                  </p>
                </div>

                {/* Feature 2 */}
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Weekly Deep Dive Analysis</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    Every Sunday morning. Comprehensive market outlook and key themes for the week ahead.
                  </p>
                </div>

                {/* Feature 3 */}
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Private Discord Community</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    847+ active traders sharing insights and real-time market discussion.
                  </p>
                </div>

                {/* Feature 4 */}
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Trading Room Access</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    Live analysis & alerts from professional traders.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Annual Card */}
          <div
            className="relative p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.5)',
              boxShadow: '0 0 50px rgba(201,166,70,0.2)'
            }}
          >
            {/* BEST DEAL Badge */}
            <div className="absolute -top-3 right-8">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                BEST DEAL
              </div>
            </div>

            <div className="pt-6">
              {/* Title */}
              <h3 className="text-2xl font-bold mb-1" style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Unlock WAR ZONE
              </h3>
              <h3 className="text-2xl font-bold text-white mb-2">
                Annual Access
              </h3>
              <p className="text-sm text-slate-400 mb-6 px-4 py-1.5 rounded-lg inline-block" style={{
                background: 'rgba(201,166,70,0.1)',
                border: '1px solid rgba(201,166,70,0.2)'
              }}>
                FOR SERIOUS TRADERS ONLY
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline justify-start gap-2 mb-1">
                  <span className="text-5xl font-bold text-white">${YEARLY_PRICE}</span>
                  <span className="text-xl text-slate-400">/year</span>
                </div>
                <p className="text-slate-400 text-sm">
                  ~${YEARLY_MONTHLY_EQUIVALENT}/month • <span className="text-emerald-400 font-semibold">Save ${YEARLY_SAVINGS}</span>
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Priority Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Locked price for 12 months</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Early Access to new features</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Founding Members badge</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handlePayment('yearly')}
                disabled={isLoading}
                className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                }}
              >
                {isLoading && selectedPlan === 'yearly' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Redirecting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    GET ANNUAL PLAN
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500 mb-6">
                Locked price. Cancel anytime.
              </p>

              {/* Additional Perks */}
              <div className="space-y-2 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-400">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-400">Save {Math.round((YEARLY_SAVINGS / (MONTHLY_PRICE * 12)) * 100)}% vs monthly</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-400">No lock-in contracts</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <p className="text-slate-400 text-base">
            The same institutional-grade intel Wall Street uses. Delivered to your inbox every morning.
          </p>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 text-slate-400"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm">Secure payment</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm">Cancel anytime</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm">Instant access</span>
          </div>
        </motion.div>

      </div>
      
      {/* Disclaimer Popup */}
      <DisclaimerPopup />
    </section>
  );
}