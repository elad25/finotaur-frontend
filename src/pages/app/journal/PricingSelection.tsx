// src/pages/app/journal/PricingSelection.tsx
// =====================================================
// FINOTAUR POST-SIGNUP - TOP SECRET CHECKOUT v10.0
// =====================================================
//
// v10.0 CHANGES:
// - ADDED: PromoCodePopup before checkout
// - Users see the promo code and can copy it before checkout
// - Popup shows: 14 days free, $35 for 2 months, then $70
//
// v9.0 CHANGES:
// - New hero: "Know Where The Market Is Moving — Before Everyone Else"
// - LIMITED TIME OFFER banner
// - New pricing: Monthly $70 (only $35 for first 2 months)
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Crown, Shield, LogOut, Check, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import PromoCodePopup from '@/components/checkout/PromoCodePopup';

// =====================================================
// COMPONENT
// =====================================================

export default function PricingSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  
  // 🔥 v10.0: Popup state
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [pendingBillingInterval, setPendingBillingInterval] = useState<'monthly' | 'yearly' | null>(null);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('TOP Secret checkout initiated');
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
      if (!user) {
        console.log('No user, redirecting to register');
        navigate('/auth/register');
        return;
      }

      setCheckingSubscription(true);

      try {
        const paymentSuccess = searchParams.get('payment') === 'success';
        const fromWhop = searchParams.get('source') === 'whop';

        const { data, error } = await supabase
          .from('profiles')
          .select(`
            top_secret_enabled,
            top_secret_status,
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
          window.history.replaceState({}, '', '/pricing-selection');

          await supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          await createWelcomeNotification(user.id);

          toast.success('Welcome to Finotaur!', {
            description: 'Your subscription is being activated...'
          });

          navigate('/app/top-secret?payment=success&source=whop');
          return;
        }

        const hasTopSecret = data?.top_secret_status === 'active' && data?.top_secret_enabled === true;

        if (hasTopSecret) {
          navigate('/app/top-secret');
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
          title: 'Welcome to Top Secret Intelligence!',
          content: 'Your 14-day free trial has started. Check your email for upcoming report alerts.',
          type: 'success',
          target_group: 'top_secret',
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
  // 🔥 v10.0: Handle Payment - Show popup first for monthly
  // =====================================================

  const handlePayment = async (billingInterval: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    // For monthly plan - show promo popup first
    if (billingInterval === 'monthly') {
      setPendingBillingInterval(billingInterval);
      setShowPromoPopup(true);
      return;
    }

    // For yearly - go directly to checkout (no promo code needed)
    proceedToCheckout(billingInterval);
  };

  // =====================================================
  // 🔥 v10.0: Proceed to checkout after popup
  // =====================================================

  const proceedToCheckout = async (billingInterval: 'monthly' | 'yearly') => {
    setSelectedPlan(billingInterval);
    setShowPromoPopup(false);

    await initiateCheckout({
      planName: 'top_secret',
      billingInterval,
    });
  };

  // =====================================================
  // Handle Skip (Continue without TOP SECRET)
  // =====================================================

  const handleSkip = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      navigate('/app/top-secret');
    } catch (error) {
      console.error('Error skipping:', error);
      navigate('/app/top-secret');
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
  // Loading state
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
  // RENDER
  // =====================================================

  return (
    <section className="min-h-screen py-12 px-4 relative overflow-hidden bg-[#0A0A0A]">
      {/* 🔥 v10.0: Promo Code Popup */}
      <PromoCodePopup
        isOpen={showPromoPopup}
        onClose={() => setShowPromoPopup(false)}
        onContinue={() => pendingBillingInterval && proceedToCheckout(pendingBillingInterval)}
        promoCode="FINOTAUR50"
        productName="Top Secret"
        originalPrice={70}
        discountedPrice={35}
        trialDays={14}
        discountMonths={2}
      />

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
          {/* Premium Intelligence Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
              border: '1px solid rgba(201,166,70,0.4)',
              boxShadow: '0 0 40px rgba(201,166,70,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}>
            <Crown className="w-5 h-5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold tracking-wide">Premium Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-3" style={{ letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            <span className="text-white">Know Where</span>
            <br />
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              The Market Is Moving —
            </span>
            <br />
            <span className="text-white">Before Everyone Else</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mt-4">
            Stop guessing and stay ahead with institutional-grade insights<br />
            that show you exactly where the market is headed—<br />
            and where it isn't.
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
            <span className="text-[#C9A646] font-bold text-lg">LIMITED TIME OFFER: 14 DAYS FREE & 50% OFF FIRST 2 MONTHS</span>
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
                <div className="flex items-baseline justify-start gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">$70</span>
                  <span className="text-xl text-slate-400">/month</span>
                </div>
                <p className="text-sm font-bold text-blue-400 mb-1">
                  FREE 14 DAY TRIAL
                </p>
                <p className="text-emerald-400 text-base font-semibold">
                  Only <span className="text-2xl">$35/month</span> for the first 2 months!
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
                    <span className="text-base font-bold text-white">Actionable Macro Insights</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    Cut through the noise. Understand ISM, and get a clear view of which sectors to target and which to avoid.
                  </p>
                </div>

                {/* Feature 2 */}
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Only the Opportunities That Actually Matter This Month</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    A tightly filtered set of ideas backed by macro data, ISM signals, and institutional-style reasoning — not lists, not hype.
                  </p>
                </div>

                {/* Feature 3 */}
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Smart Crypto Reports <span className="text-xs text-slate-500 font-normal">(Optional)</span></span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    Up-to-date crypto market analysis and bi-weekly reports for those interested in digital assets.
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
                Unlock Top Secret
              </h3>
              <h3 className="text-2xl font-bold text-white mb-2">
                Institutional Research
              </h3>
              <p className="text-sm text-slate-400 mb-6 px-4 py-1.5 rounded-lg inline-block" style={{
                background: 'rgba(201,166,70,0.1)',
                border: '1px solid rgba(201,166,70,0.2)'
              }}>
                FOR SERIOUS INVESTORS ONLY
              </p>

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
                  <span className="text-sm text-slate-300 font-medium">Early Access to future FINOTAUR tools</span>
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
                  <span className="text-sm text-slate-400">50% off 2 months</span>
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
            No fluff, lists or hype. Just exclusive opportunities.
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
        </motion.div>

      </div>
    </section>
  );
}