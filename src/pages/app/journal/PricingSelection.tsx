// src/pages/app/journal/PricingSelection.tsx
// =====================================================
// FINOTAUR POST-SIGNUP - TOP SECRET CHECKOUT v6.0
// =====================================================
//
// v6.0 CHANGES:
// - REPLACED: Journal pricing with TOP SECRET checkout
// - ADDED: Automatic payment popup on page load
// - ADDED: 14-day trial for TOP SECRET
// - UPDATED: Redirect flow to TOP SECRET after payment
// - ADDED: Welcome notification after signup
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Crown, Shield, LogOut, Loader2, Check, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TopSecretPaymentPopup from '@/components/TopSecretPaymentPopup';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

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
          setShowPaymentPopup(true);
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

        // New user - show payment popup
        console.log('New user, showing TOP SECRET checkout');
        setCheckingSubscription(false);
        setShowPaymentPopup(true);

      } catch (error) {
        console.error('Error checking subscription:', error);
        setCheckingSubscription(false);
        setShowPaymentPopup(true);
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
  // Handle popup close
  // =====================================================

  const handlePaymentPopupClose = () => {
    // Don't allow closing without payment - user must subscribe or exit
    // setShowPaymentPopup(false);
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
    <>
      {/* Payment Popup - Always shown */}
      <TopSecretPaymentPopup
        isOpen={showPaymentPopup}
        onClose={handlePaymentPopupClose}
      />

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

        <div className="max-w-4xl mx-auto relative z-10 pt-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            {/* Crown Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                border: '1px solid rgba(201,166,70,0.4)',
                boxShadow: '0 0 40px rgba(201,166,70,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
              <Crown className="w-5 h-5 text-[#C9A646]" />
              <span className="text-[#C9A646] font-semibold tracking-wide">Premium Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ letterSpacing: '-0.03em' }}>
              <span className="text-white">Welcome to </span>
              <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Top Secret
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Get the same institutional-grade research that hedge funds pay thousands for
            </p>
          </motion.div>

          {/* Trial Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto mb-10"
          >
            <div
              className="p-5 rounded-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',
                border: '2px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 40px rgba(59,130,246,0.2)'
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(59,130,246,0.2)',
                    border: '1px solid rgba(59,130,246,0.4)',
                  }}
                >
                  <Clock className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">
                    Try Free for 14 Days
                  </h3>
                  <p className="text-blue-400/80 text-sm">
                    No charge today. Cancel anytime during trial - no questions asked.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Email Notification Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-xl mx-auto mb-10"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30">
              <Mail className="w-6 h-6 text-[#C9A646]" />
              <div>
                <p className="text-[#C9A646] font-medium">Email notifications enabled</p>
                <p className="text-sm text-[#C9A646]/70">
                  You'll receive alerts in your notification center when new reports are ready
                </p>
              </div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12"
          >
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-slate-300">{feature.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <Button
              onClick={() => setShowPaymentPopup(true)}
              className="px-12 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                backgroundSize: '200% auto',
                color: '#000',
                boxShadow: '0 8px 32px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)'
              }}
            >
              Start 14-Day Free Trial
            </Button>

            <p className="text-sm text-slate-500 mt-4">
              $35/month after trial - Cancel anytime
            </p>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap items-center justify-center gap-8 mt-12 text-slate-400"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Secure payment</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-sm">14-day free trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
