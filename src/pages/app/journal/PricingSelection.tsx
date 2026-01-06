// src/pages/app/journal/PricingSelection.tsx
// =====================================================
// FINOTAUR POST-SIGNUP - TOP SECRET CHECKOUT v7.0
// =====================================================
//
// v7.0 CHANGES:
// - REMOVED: Payment popup - checkout is now inline
// - ADDED: Billing toggle (Monthly/Yearly) on page
// - SIMPLIFIED: Single page checkout flow
//
// Pricing:
// - Monthly: $35/month with 14-day free trial
// - Yearly: $300/year with 14-day free trial (Save $120)
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Crown, Shield, LogOut, Check, Clock, Mail, ArrowRight, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';

// =====================================================
// TYPES
// =====================================================

type BillingInterval = 'monthly' | 'yearly';

// =====================================================
// PLAN DETAILS
// =====================================================

const planDetails = {
  monthly: {
    price: 35,
    period: '/month',
    label: 'Monthly',
  },
  yearly: {
    price: 300,
    period: '/year',
    monthlyEquivalent: 25,
    label: 'Yearly',
    savings: 120,
  }
};

// =====================================================
// FEATURES LIST
// =====================================================

const features = [
  { text: 'Monthly ISM Manufacturing Report', icon: '📊' },
  { text: '2x Company Deep Dive Reports', icon: '🏢' },
  { text: '2x Crypto Market Reports', icon: '🪙' },
  { text: 'PDF Downloads & Archive Access', icon: '📁' },
  { text: 'Discord Community Access', icon: '💬' },
  { text: 'Email Delivery', icon: '📧' },
];

// =====================================================
// COMPONENT
// =====================================================

export default function PricingSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('TOP Secret checkout initiated');
    },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    }
  });

  const selectedPlan = planDetails[billingInterval];
  const isYearly = billingInterval === 'yearly';

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
        // Check for Whop callback parameters
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

        console.log('User subscription status:', data);

        // If returning from Whop with successful payment
        if (paymentSuccess || fromWhop) {
          console.log('User returned from Whop payment');

          // Clean URL params
          window.history.replaceState({}, '', '/pricing-selection');

          // Mark onboarding as completed
          await supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          // Create welcome notification
          await createWelcomeNotification(user.id);

          // Redirect to TOP SECRET
          toast.success('Welcome to Finotaur!', {
            description: 'Your subscription is being activated...'
          });

          navigate('/app/top-secret?payment=success&source=whop');
          return;
        }

        // If user already has TOP SECRET active, redirect to dashboard
        const hasTopSecret = data?.top_secret_status === 'active' && data?.top_secret_enabled === true;

        if (hasTopSecret) {
          console.log('User already has TOP SECRET, redirecting to dashboard');
          navigate('/app/top-secret');
          return;
        }

        // New user - show checkout page
        console.log('New user, showing TOP SECRET checkout');
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
          content: 'Your 14-day free trial has started. Check your email for upcoming report alerts. You will receive 5 premium reports monthly.',
          type: 'success',
          target_group: 'top_secret',
          is_active: true,
          metadata: {
            report_type: 'welcome',
            user_id: userId
          }
        });

      console.log('Welcome notification created');
    } catch (error) {
      console.error('Error creating welcome notification:', error);
    }
  };

  // =====================================================
  // Handle Payment
  // =====================================================

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    console.log('Starting TOP SECRET checkout:', {
      billingInterval,
      userEmail: user.email,
    });

    await initiateCheckout({
      planName: 'top_secret',
      billingInterval,
    });
  };

  // =====================================================
  // Handle exit
  // =====================================================

  const handleExit = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
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

      <div className="max-w-4xl mx-auto relative z-10 pt-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
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
            <span className="text-white">Welcome to </span>
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              Top Secret
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Get the same institutional-grade research that hedge funds pay thousands for
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-lg mx-auto"
        >
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)',
              border: '1px solid rgba(201,166,70,0.3)',
              boxShadow: '0 0 60px rgba(201,166,70,0.15)'
            }}
          >
            {/* 14-Day Trial Badge */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-blue-400 font-semibold">14-Day Free Trial</div>
                <p className="text-xs text-blue-400/70">No charge today. Cancel anytime during trial.</p>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-5">
              <div
                className="inline-flex p-1.5 rounded-xl"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    billingInterval === 'monthly'
                      ? 'text-black'
                      : 'text-slate-500 hover:text-white'
                  }`}
                  style={billingInterval === 'monthly' ? {
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    boxShadow: '0 4px 15px rgba(201,166,70,0.4)'
                  } : {}}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    billingInterval === 'yearly'
                      ? 'text-black'
                      : 'text-slate-500 hover:text-white'
                  }`}
                  style={billingInterval === 'yearly' ? {
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    boxShadow: '0 4px 15px rgba(201,166,70,0.4)'
                  } : {}}
                >
                  Yearly
                  {billingInterval === 'yearly' && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                      Save $120
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Price Display */}
            <div className="text-center py-4">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">
                  ${selectedPlan.price}
                </span>
                <span className="text-xl text-slate-500">{selectedPlan.period}</span>
              </div>
              {isYearly && (
                <p className="text-emerald-400 font-semibold mt-1">
                  Just $25/month - Save $120!
                </p>
              )}
              <p className="text-sm text-blue-400 mt-2">
                First 14 days free, then ${selectedPlan.price}{selectedPlan.period}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-2 mb-5">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(201,166,70,0.15)',
                      border: '1px solid rgba(201,166,70,0.3)'
                    }}
                  >
                    <Check className="w-3 h-3 text-[#C9A646]" />
                  </div>
                  <span className="text-sm text-slate-300">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Security Features */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="w-4 h-4 text-[#C9A646]" />
                <span>Secure payment</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock className="w-4 h-4 text-[#C9A646]" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CreditCard className="w-4 h-4 text-[#C9A646]" />
                <span>Powered by Whop</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>No charge today</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handlePayment}
              disabled={isLoading || !user}
              className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                backgroundSize: '200% auto',
                color: '#000',
                boxShadow: '0 8px 32px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)'
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Redirecting to checkout...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Start 14-Day Free Trial
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>

            <p className="text-[10px] text-center text-slate-500 mt-4">
              By starting your trial, you agree to our Terms of Service.
              You won't be charged until after your 14-day trial ends.
            </p>
          </div>
        </motion.div>

        {/* Email Notification Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-lg mx-auto mt-6"
        >
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30">
            <Mail className="w-6 h-6 text-[#C9A646]" />
            <div>
              <p className="text-[#C9A646] font-medium">Email notifications enabled</p>
              <p className="text-sm text-[#C9A646]/70">
                You'll receive alerts when new reports are ready
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
