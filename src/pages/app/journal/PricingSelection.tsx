// src/pages/app/journal/PricingSelection.tsx
// =====================================================
// FINOTAUR POST-SIGNUP - TOP SECRET CHECKOUT v8.0
// =====================================================
//
// v8.0 CHANGES:
// - TWO SEPARATE CARDS: Monthly & Yearly
// - Monthly: $35/month with 14-day free trial badge
// - Yearly: $300/year (Save $120)
// - Added "Continue without TOP SECRET" button
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Crown, Shield, LogOut, Check, Clock, ArrowRight, Sparkles, Flame, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';

// =====================================================
// FEATURES LIST
// =====================================================

const features = [
  'Monthly ISM Manufacturing Report',
  '2x Company Deep Dive Reports',
  '2x Crypto Market Reports',
  'PDF Downloads & Archive Access',
  'Discord Community Access',
  'Email Delivery',
];

// =====================================================
// COMPONENT
// =====================================================

export default function PricingSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

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
  // Handle Payment
  // =====================================================

  const handlePayment = async (billingInterval: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    setSelectedPlan(billingInterval);

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

      {/* Skip Button - Top Left */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#C9A646] font-semibold transition-all hover:bg-[#C9A646]/10 border border-[#C9A646]/50 hover:border-[#C9A646]"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Skip
        </button>
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

      <div className="max-w-5xl mx-auto relative z-10 pt-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Crown Badge */}
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.03em' }}>
            <span className="text-white">Unlock </span>
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              Top Secret
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Get the same institutional-grade research that hedge funds pay thousands for
          </p>
        </motion.div>

        {/* Early Sale Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div
            className="p-4 rounded-xl flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)',
              border: '2px solid rgba(239,68,68,0.5)',
              boxShadow: '0 0 30px rgba(239,68,68,0.2)'
            }}
          >
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-red-400 font-bold text-lg">EARLY SALE IS ON</span>
              <Flame className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <span className="text-slate-300 mx-2">|</span>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300 text-sm">
                Prices increase on <span className="text-yellow-400 font-semibold">January 31st</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8"
        >
          {/* Monthly Card */}
          <div
            className="relative p-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(15,15,15,0.98) 100%)',
              border: '2px solid rgba(59,130,246,0.5)',
              boxShadow: '0 0 40px rgba(59,130,246,0.15)'
            }}
          >
            {/* Trial Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500 text-white text-sm font-bold shadow-lg">
                <Clock className="w-4 h-4" />
                14-Day Free Trial
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-bold text-white mb-1 text-center">Monthly</h3>

              {/* Price */}
              <div className="text-center py-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">$35</span>
                  <span className="text-lg text-slate-400">/month</span>
                </div>
                <p className="text-sm text-blue-400 mt-2">
                  First 14 days free
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-5">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handlePayment('monthly')}
                disabled={isLoading}
                className="w-full py-5 text-base font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #3B82F6 100%)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(59,130,246,0.4)'
                }}
              >
                {isLoading && selectedPlan === 'monthly' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirecting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Yearly Card */}
          <div
            className="relative p-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(15,15,15,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.5)',
              boxShadow: '0 0 40px rgba(201,166,70,0.15)'
            }}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                <Sparkles className="w-4 h-4" />
                Save $120
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-bold text-white mb-1 text-center">Yearly</h3>

              {/* Price */}
              <div className="text-center py-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">$300</span>
                  <span className="text-lg text-slate-400">/year</span>
                </div>
                <p className="text-sm text-emerald-400 mt-2">
                  Just $25/month
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-5">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handlePayment('yearly')}
                disabled={isLoading}
                className="w-full py-5 text-base font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
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
                    Get Yearly
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 mb-8 text-slate-400"
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
