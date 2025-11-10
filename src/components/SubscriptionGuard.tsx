// src/components/SubscriptionGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Lock, Crown } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredPlan: 'free' | 'basic' | 'premium';
  feature?: string;
}

export function SubscriptionGuard({ children, requiredPlan, feature }: SubscriptionGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('account_type, subscription_status, payment_provider')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        console.log('🔒 SubscriptionGuard: Checking access for', {
          user: user.id,
          requiredPlan,
          userPlan: data?.account_type,
          status: data?.subscription_status,
          paymentProvider: data?.payment_provider
        });

        // 🔥 CRITICAL: Check if user has valid subscription
        const isActive = data?.subscription_status === 'active' || data?.subscription_status === 'trial';
        const hasPaidViaPayPlus = data?.payment_provider === 'payplus';

        // Free plan always has access to free features
        if (requiredPlan === 'free') {
          setHasAccess(true);
          setChecking(false);
          return;
        }

        // Basic plan requires active subscription + PayPlus payment
        if (requiredPlan === 'basic') {
          const hasBasicAccess = 
            data?.account_type === 'basic' && 
            isActive && 
            hasPaidViaPayPlus;
          
          setHasAccess(hasBasicAccess);
          setChecking(false);
          return;
        }

        // Premium plan requires active subscription + PayPlus payment
        if (requiredPlan === 'premium') {
          const hasPremiumAccess = 
            data?.account_type === 'premium' && 
            isActive && 
            hasPaidViaPayPlus;
          
          setHasAccess(hasPremiumAccess);
          setChecking(false);
          return;
        }

        setHasAccess(false);
        setChecking(false);

      } catch (error) {
        console.error('❌ SubscriptionGuard: Error checking access:', error);
        setHasAccess(false);
        setChecking(false);
      }
    };

    checkAccess();
  }, [user, requiredPlan]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="text-sm text-zinc-400">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
            {requiredPlan === 'premium' ? (
              <Crown className="w-8 h-8 text-yellow-500" />
            ) : (
              <Lock className="w-8 h-8 text-yellow-500" />
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">
            {requiredPlan === 'premium' ? 'Premium' : 'Basic'} Feature
          </h3>
          
          <p className="text-zinc-400 mb-6">
            {feature ? `${feature} requires a ${requiredPlan} subscription.` : `This feature requires a ${requiredPlan} subscription.`}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/app/journal/pricing')}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all"
            >
              Upgrade to {requiredPlan === 'premium' ? 'Premium' : 'Basic'}
            </button>
            
            <button
              onClick={() => navigate('/app/journal/overview')}
              className="w-full px-6 py-3 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}