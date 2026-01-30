// =====================================================
// WAR ZONE PRICING SELECTION PAGE
// Post-signup checkout page for WAR ZONE
// Styled like TOP SECRET PricingSelection
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Crown, Shield, LogOut, Check, Clock, ArrowRight, ChevronRight,
  FileText, Calendar, Headphones, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';

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
const WHOP_BUNDLE_MONTHLY_PLAN_ID = 'plan_ujyQUPIi7UIvN'; // Bundle Monthly
const WHOP_BUNDLE_YEARLY_PLAN_ID = 'plan_M2zS1EoNXJF10';  // Bundle Yearly
const BUNDLE_MONTHLY_PRICE = 109;
const BUNDLE_YEARLY_PRICE = 997;

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
  // Handle Payment - Show popup first for monthly
  // =====================================================
  const handlePayment = async (billingInterval: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    setSelectedPlan(billingInterval);

    await initiateCheckout({
      planName: 'newsletter',
      billingInterval,
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
    </section>
  );
}