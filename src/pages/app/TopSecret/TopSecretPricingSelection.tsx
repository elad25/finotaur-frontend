// src/pages/app/TopSecret/TopSecretPricingSelection.tsx
// =====================================================
// TOP SECRET PRICING SELECTION PAGE
// =====================================================
// Dedicated pricing page for TOP SECRET subscription
// Monthly: $35, Yearly: $300 (Save 29%)
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Check, Shield, Zap, Clock, LogOut, Loader2, Lock, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { PLANS, buildWhopCheckoutUrl } from '@/lib/whop-config';

type BillingInterval = 'monthly' | 'yearly';

interface TopSecretPlan {
  id: 'top_secret_monthly' | 'top_secret_yearly';
  name: string;
  price: number;
  monthlyEquivalent?: number;
  period: BillingInterval;
  features: string[];
  badge?: string;
}

const topSecretPlans: TopSecretPlan[] = [
  {
    id: 'top_secret_monthly',
    name: 'Monthly',
    price: 35,
    period: 'monthly',
    features: [
      'Company Analysis Reports',
      'Economic Reports (ISM, CPI, NFP, FOMC)',
      'Crypto Reports & On-chain Analysis',
      'Clear directional bias',
      'Actionable conclusions',
      'Private Discord community',
      'Cancel anytime',
    ],
  },
  {
    id: 'top_secret_yearly',
    name: 'Annual',
    price: 300,
    monthlyEquivalent: 25,
    period: 'yearly',
    badge: 'Save 29%',
    features: [
      'Everything in Monthly, plus:',
      '29% savings vs monthly ($120 saved)',
      'Lock in current price',
      'Priority access to new reports',
      'Annual member badge in Discord',
    ],
  },
];

export default function TopSecretPricingSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check if user already has TOP SECRET access
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        console.log('❌ No user, redirecting to register');
        navigate('/register?redirect=top-secret-pricing');
        return;
      }

      setCheckingSubscription(true);

      try {
        // Check for Whop callback parameters
        const paymentSuccess = searchParams.get('payment') === 'success';
        const fromWhop = searchParams.get('source') === 'whop';

        const { data, error } = await supabase
          .from('profiles')
          .select('top_secret_enabled, top_secret_status, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking subscription:', error);
          setCheckingSubscription(false);
          return;
        }

        // If returning from Whop with successful payment
        if (paymentSuccess || fromWhop) {
          console.log('🎉 User returned from Whop payment');
          window.history.replaceState({}, '', '/pricing-selection/top-secret');
          toast.success('Welcome to TOP SECRET! 🎉');
          navigate('/app/top-secret');
          return;
        }

        // Check if already has TOP SECRET access
        const isAdmin = data?.role === 'admin' || data?.role === 'super_admin';
        const hasTopSecret = data?.top_secret_enabled && data?.top_secret_status === 'active';

        if (isAdmin || hasTopSecret) {
          console.log('✅ User already has TOP SECRET access');
          navigate('/app/top-secret');
          return;
        }

        console.log('💡 User needs to purchase TOP SECRET');
      } catch (error) {
        console.error('❌ Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, navigate, searchParams]);

  // Handle checkout
  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please log in first');
      navigate('/register?redirect=top-secret-pricing');
      return;
    }

    setLoading(true);

    try {
      const planId = billingInterval === 'monthly' ? 'top_secret_monthly' : 'top_secret_yearly';

      const checkoutUrl = buildWhopCheckoutUrl({
        planId,
        userEmail: user.email || undefined,
        userId: user.id,
        redirectUrl: window.location.origin,
      });

      console.log('🚀 Redirecting to Whop checkout:', checkoutUrl);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('❌ Checkout error:', error);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const selectedPlan = topSecretPlans.find(p => p.period === billingInterval)!;
  const displayPrice = billingInterval === 'monthly' ? selectedPlan.price : selectedPlan.monthlyEquivalent!;

  // Loading state
  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen py-24 px-4 relative overflow-hidden bg-black">
      {/* Top Navigation */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await logout();
              navigate('/');
            } catch (error) {
              navigate('/');
            }
          }}
          className="flex items-center gap-2 text-white border-white/30 hover:border-white/60 hover:bg-white/10 transition-all font-semibold px-5 py-2"
        >
          EXIT
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#18140A] to-[#0B0B0B]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[160px]" />
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-[#D4AF37]/[0.08] rounded-full blur-[120px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <Lock className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] text-sm font-medium">TOP SECRET</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Join </span>
            <span className="text-[#C9A646]">TOP SECRET</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Institutional-grade research that tells you how to think, not what to buy.
          </p>
        </motion.div>

        {/* What's Included */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <div className="p-6 rounded-2xl bg-[#141414]/80 border border-[#C9A646]/20 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C9A646]" />
              3 Types of Reports Every Month
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 font-semibold mb-1">Company Analysis</p>
                <p className="text-slate-400 text-sm">Earnings, fundamentals, institutional positioning</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 font-semibold mb-1">Economic Reports</p>
                <p className="text-slate-400 text-sm">ISM, CPI, NFP, FOMC decoded</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-400 font-semibold mb-1">Crypto Reports</p>
                <p className="text-slate-400 text-sm">On-chain analysis, macro correlation</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-full p-1.5">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                billingInterval === 'monthly'
                  ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                billingInterval === 'yearly'
                  ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                Save 29%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <div
            className="p-8 rounded-2xl relative"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
              border: '2px solid rgba(201,166,70,0.4)',
              boxShadow: '0 12px 50px rgba(201,166,70,0.3)',
            }}
          >
            {/* Badge */}
            {billingInterval === 'yearly' && (
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  color: 'white',
                }}
              >
                Save $120/year
              </div>
            )}

            {/* Price */}
            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold text-[#C9A646]">${displayPrice}</span>
                <span className="text-slate-400">/month</span>
              </div>
              {billingInterval === 'yearly' && (
                <p className="text-sm text-slate-500">
                  Billed ${selectedPlan.price}/year
                </p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {selectedPlan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#C9A646]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-[#C9A646]" />
                  </div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-[1.02] transition-all duration-300"
              style={{
                boxShadow: '0 8px 32px rgba(201,166,70,0.5)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Join TOP SECRET
                  <TrendingUp className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Secure payment</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Instant access</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No signals. No hype. No predictions. This tells you how to think about the market.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
